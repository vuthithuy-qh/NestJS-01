import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GoogleGenerativeAI, Content } from '@google/generative-ai';
import { Cat } from '../cats/entities/cat.entity';
import { Category } from '../category/entities/category.entity';
import { ChatMessageDto } from './dto/chat-message.dto';

@Injectable()
export class ChatService implements OnModuleInit {
  private readonly logger = new Logger(ChatService.name);
  private genAI: GoogleGenerativeAI;
  private modelName = 'gemini-2.5-flash';

  // Cached shop context (refreshed periodically)
  private shopContext = '';
  private lastContextRefresh = 0;
  private readonly CONTEXT_TTL = 5 * 60 * 1000; // 5 minutes

  // Rate-limit guard (per-server, simple sliding window)
  private requestTimestamps: number[] = [];
  private readonly MAX_REQUESTS_PER_MINUTE = 10;
  private readonly RATE_WINDOW_MS = 60_000;

  // Retry config
  private readonly MAX_RETRIES = 2;
  private readonly RETRY_DELAY_MS = 2000;

  constructor(
    private configService: ConfigService,
    @InjectRepository(Cat)
    private catRepository: Repository<Cat>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
  ) {}

  onModuleInit() {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY') {
      this.logger.warn(
        '⚠️  GEMINI_API_KEY chưa được cấu hình! Chat AI sẽ không hoạt động.',
      );
      return;
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.logger.log('✅ Google Gemini AI initialized');
  }

  /**
   * Build dynamic shop data context from the database
   */
  private async buildShopContext(): Promise<string> {
    const now = Date.now();
    if (this.shopContext && now - this.lastContextRefresh < this.CONTEXT_TTL) {
      return this.shopContext;
    }

    try {
      // Fetch categories
      const categories = await this.categoryRepository.find();
      const categoryList = categories
        .map((c) => `- ${c.name} (ID: ${c.id})`)
        .join('\n');

      // Fetch all cats with specs
      const cats = await this.catRepository.find({
        relations: ['category', 'specs'],
        order: { createdAt: 'DESC' },
      });

      const catList = cats
        .map((cat) => {
          const prices =
            cat.specs?.map((s) => Number(s.price)).filter((p) => p > 0) || [];
          const minPrice = prices.length
            ? Math.min(...prices).toLocaleString('vi-VN')
            : 'Liên hệ';
          const maxPrice = prices.length
            ? Math.max(...prices).toLocaleString('vi-VN')
            : 'Liên hệ';
          const priceRange =
            minPrice === maxPrice
              ? `${minPrice}₫`
              : `${minPrice}₫ - ${maxPrice}₫`;
          const totalStock =
            cat.specs?.reduce((sum, s) => sum + (s.qtyInStock || 0), 0) || 0;
          const statusVi =
            cat.status === 'available'
              ? 'Có sẵn'
              : cat.status === 'sold'
                ? 'Đã bán'
                : 'Đã đặt';
          const genderVi =
            cat.gender === 'male'
              ? 'Đực'
              : cat.gender === 'female'
                ? 'Cái'
                : 'Không rõ';

          return `- ${cat.name} | Giống: ${cat.category?.name || 'N/A'} | Giới tính: ${genderVi} | Giá: ${priceRange} | Tồn kho: ${totalStock} | Trạng thái: ${statusVi}`;
        })
        .join('\n');

      const totalCats = cats.length;
      const availableCats = cats.filter((c) => c.status === 'available').length;

      this.shopContext = `
=== THÔNG TIN CỬA HÀNG PET SHOP VU ===

📍 Thông tin liên hệ:
- Tên cửa hàng: Pet Shop Vu
- Website: http://localhost:5500 (đang phát triển)
- Hỗ trợ mua hàng qua website hoặc liên hệ trực tiếp

🛒 Hướng dẫn mua hàng:
1. Truy cập trang chủ, xem danh sách mèo
2. Click vào mèo muốn mua để xem chi tiết (giá, phân loại, hình ảnh)
3. Chọn phân loại (nếu có), số lượng → click "Thêm vào giỏ hàng" hoặc "Mua ngay"
4. Vào giỏ hàng, kiểm tra sản phẩm → click "Thanh toán"
5. Nhập địa chỉ giao hàng, chọn phương thức vận chuyển (GHN)
6. Hoàn tất đơn hàng → theo dõi đơn tại mục "Đơn hàng"

💳 Phương thức thanh toán:
- COD (thanh toán khi nhận hàng)
- VNPay (thanh toán online)

🚚 Vận chuyển:
- Giao hàng qua GHN (Giao Hàng Nhanh)
- Phí ship tính tự động theo địa chỉ

📊 Tổng quan kho hàng:
- Tổng số mèo: ${totalCats}
- Đang có sẵn: ${availableCats}

📂 Các giống mèo (danh mục):
${categoryList}

🐱 Danh sách mèo hiện có:
${catList}
`;

      this.lastContextRefresh = now;
    } catch (err) {
      this.logger.error('Lỗi build shop context:', err.message);
      if (!this.shopContext) {
        this.shopContext =
          'Không lấy được dữ liệu cửa hàng. Hãy trả lời chung về mèo.';
      }
    }

    return this.shopContext;
  }

  /**
   * System prompt for the AI
   */
  private getSystemPrompt(shopData: string): string {
    return `Bạn là "Mèo Bot 🐱" — trợ lý AI của cửa hàng Pet Shop Vu, chuyên về các loại mèo.

NGUYÊN TẮC:
1. Trả lời bằng tiếng Việt, thân thiện, dễ hiểu, ngắn gọn.
2. Bạn là chuyên gia về mèo: giống mèo, chăm sóc, sức khỏe, dinh dưỡng, hành vi mèo.
3. Bạn được "train" về dữ liệu cửa hàng Pet Shop Vu bên dưới → hãy tư vấn chính xác dựa trên dữ liệu thực.
4. Khi khách hỏi về giá, mèo có sẵn → tra cứu từ danh sách bên dưới.
5. Nếu khách hỏi ngoài phạm vi (mèo / cửa hàng), hãy nhẹ nhàng chuyển hướng về chủ đề mèo.
6. Dùng emoji phù hợp để response sinh động hơn (nhưng đừng quá nhiều).
7. Khi gợi ý mèo, hãy nêu tên + giá + trạng thái.
8. Nếu khách chưa biết mua gì, hãy hỏi về nhu cầu (giống, giới tính, ngân sách) để tư vấn.
9. Format response bằng markdown khi cần (bold, list, etc.) nhưng đừng quá dài.
10. TUYỆT ĐỐI KHÔNG bịa thông tin về cửa hàng. Nếu không có dữ liệu, nói "hiện tại mình chưa có thông tin này".

${shopData}
`;
  }

  /**
   * Chat with the AI
   */
  async chat(dto: ChatMessageDto): Promise<{ reply: string }> {
    if (!this.genAI) {
      return {
        reply:
          'Xin lỗi, Chat AI hiện chưa được cấu hình. Vui lòng liên hệ admin! 😿',
      };
    }

    // ── Local rate-limit check ──
    const now = Date.now();
    this.requestTimestamps = this.requestTimestamps.filter(
      (t) => now - t < this.RATE_WINDOW_MS,
    );
    if (this.requestTimestamps.length >= this.MAX_REQUESTS_PER_MINUTE) {
      return {
        reply:
          'Bạn ơi, mình đang nhận quá nhiều câu hỏi 😅 Chờ khoảng 1 phút rồi hỏi lại nhé!',
      };
    }
    this.requestTimestamps.push(now);

    return this.chatWithRetry(dto, 0);
  }

  /**
   * Internal: call Gemini with retry on 429
   */
  private async chatWithRetry(
    dto: ChatMessageDto,
    attempt: number,
  ): Promise<{ reply: string }> {
    try {
      const shopData = await this.buildShopContext();
      const systemPrompt = this.getSystemPrompt(shopData);

      const model = this.genAI.getGenerativeModel({
        model: this.modelName,
        systemInstruction: systemPrompt,
      });

      // Build conversation history for multi-turn
      const history: Content[] = (dto.history || []).map((h) => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.text }],
      }));

      const chat = model.startChat({ history });

      const result = await chat.sendMessage(dto.message);
      const response = result.response;
      const reply = response.text();

      return { reply };
    } catch (err) {
      this.logger.error(
        `Gemini API error (attempt ${attempt + 1}):`,
        err.message,
      );

      // ── 429 Too Many Requests → retry with back-off ──
      if (
        err.message?.includes('429') ||
        err.message?.includes('Too Many Requests') ||
        err.message?.includes('quota')
      ) {
        if (attempt < this.MAX_RETRIES) {
          const delay = this.RETRY_DELAY_MS * Math.pow(2, attempt); // exponential
          this.logger.warn(
            `Rate limited, retrying in ${delay}ms (attempt ${attempt + 2}/${this.MAX_RETRIES + 1})`,
          );
          await new Promise((r) => setTimeout(r, delay));
          return this.chatWithRetry(dto, attempt + 1);
        }
        return {
          reply:
            'Hiện tại server AI đang quá tải 😿 Bạn vui lòng chờ khoảng 1 phút rồi thử lại nhé!',
        };
      }

      if (err.message?.includes('API_KEY')) {
        return {
          reply: 'API key chưa hợp lệ. Vui lòng liên hệ admin để cấu hình! 🔑',
        };
      }

      return {
        reply: 'Xin lỗi, mình gặp lỗi khi xử lý. Bạn thử hỏi lại nhé! 😿',
      };
    }
  }
}

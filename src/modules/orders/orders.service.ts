import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { ShopOrder } from './entities/shop-order.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { OrderLine } from './entities/order-line.entity';
import { OrderStatus, OrderStatusEnum } from './entities/order-status.entity';
import { ShoppingCartService } from '../shopping-cart/shopping-cart.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UserPaymentMethod } from '../payment/entities/user-payment-method.entity';
import { ShippingMethod } from './entities/shipping-method.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(ShopOrder)
    private readonly orderRepo: Repository<ShopOrder>,

    @InjectRepository(OrderLine)
    private readonly orderLineRepo: Repository<OrderLine>,

    @InjectRepository(OrderStatus)
    private readonly orderStatusRepo: Repository<OrderStatus>,

    @InjectRepository(ShippingMethod)
    private readonly shippingMethodRepo: Repository<ShippingMethod>,

    private readonly cartService: ShoppingCartService,
  ) {}

  async CreateOrder(userId: number, dto: CreateOrderDto) {
    // Get cart with discounted prices applied
    const cartDto = await this.cartService.getCart(userId);
    if (!cartDto || cartDto.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    // Also get raw cart for entity references
    const cart = await this.cartService.getOrCreateCart(userId);

    // Filter items if specific itemIds are provided
    const dtoItems = dto.itemIds && dto.itemIds.length > 0
      ? cartDto.items.filter((item) => dto.itemIds!.includes(item.id))
      : cartDto.items;

    if (dtoItems.length === 0) {
      throw new BadRequestException('No valid items selected');
    }

    const pendingStatus = await this.orderStatusRepo.findOne({
      where: { status: OrderStatusEnum.PENDING },
    });

    if (!pendingStatus) {
      throw new BadRequestException('Order status not found');
    }

    // Use discounted prices for order total
    const itemTotal = dtoItems.reduce(
      (sum, item) => sum + item.discountedPrice * item.qty,
      0,
    );
    const shippingFee = dto.shippingFee || 0;
    const orderTotal = itemTotal + shippingFee;

    /* Tạo order lines with discounted price */
    const orderLines = dtoItems.map((dtoItem) => {
      const rawItem = cart.items.find((i) => i.id === dtoItem.id);
      return {
        catSpec: rawItem?.catSpec || { id: dtoItem.catSpecId },
        qty: dtoItem.qty,
        price: dtoItem.discountedPrice,
      };
    });

    const orderData: any = {
      user: { id: userId },
      status: pendingStatus,
      address: { id: dto.addressId },
      orderTotal,
      shippingFee,
      notes: dto.notes || null,
      orderLines,
      orderDate: new Date(),
    };
    if (dto.shippingMethodId) {
      orderData.shippingMethod = { id: dto.shippingMethodId };
    }
    const order = this.orderRepo.create(orderData);

    await this.orderRepo.save(order);

    // Only remove ordered items from cart (not clear entire cart)
    if (dto.itemIds && dto.itemIds.length > 0) {
      await this.cartService.removeItems(userId, dto.itemIds);
    } else {
      await this.cartService.clearCart(userId);
    }

    return order;
  }

  /* ==================== QUẢN LÝ ORDER CƠ BẢN ==================== */

  /**
   * Lấy order theo ID
   */
  async findById(orderId: number): Promise<ShopOrder> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['status'],
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    return order;
  }

  /**
   * Lấy order với đầy đủ relations (orderLines, user, address, status, shippingMethod)
   */
  async findOrderWithDetails(orderId: number): Promise<ShopOrder> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: [
        'orderLines',
        'orderLines.catSpec',
        'orderLines.catSpec.cat',
        'user',
        'address',
        'status',
        'shippingMethod',
        'paymentMethod',
      ],
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    return order;
  }

  /**
   * Lấy danh sách orders của user
   */
  async findByUserId(userId: number): Promise<ShopOrder[]> {
    return await this.orderRepo.find({
      where: { user: { id: userId } },
      relations: ['orderLines', 'status', 'shippingMethod'],
      order: { orderDate: 'DESC' },
    });
  }

  /**
   * Lấy order history với pagination
   */
  async getOrderHistory(
    userId: number,
    page: number = 1,
    limit: number = 10,
    status?: string,
  ) {
    const skip = (page - 1) * limit;

    const where: any = { user: { id: userId } };
    if (status) {
      where.status = { status };
    }

    const [orders, total] = await this.orderRepo.findAndCount({
      where,
      relations: [
        'orderLines',
        'orderLines.catSpec',
        'orderLines.catSpec.cat',
        'status',
        'shippingMethod',
      ],
      order: { orderDate: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data: orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Kiểm tra order có thuộc về user không (security check)
   */
  async validateOrderOwnership(
    orderId: number,
    userId: number,
  ): Promise<boolean> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, user: { id: userId } },
    });

    return !!order;
  }

  /* ==================== CẬP NHẬT TRẠNG THÁI ORDER ==================== */

  /**
   * Cập nhật trạng thái order
   */
  async updateOrderStatus(
    orderId: number,
    statusEnum: OrderStatusEnum,
  ): Promise<ShopOrder> {
    const order = await this.findById(orderId);

    const newStatus = await this.orderStatusRepo.findOne({
      where: { status: statusEnum },
    });

    if (!newStatus) {
      throw new BadRequestException(`Status ${statusEnum} not found`);
    }

    order.status = newStatus;
    return await this.orderRepo.save(order);
  }

  /**
   * Xác nhận order (PENDING → CONFIRMED)
   * Được gọi khi payment thành công
   */
  async confirmOrder(orderId: number): Promise<ShopOrder> {
    const order = await this.findById(orderId);

    // Chỉ confirm được order đang PENDING
    if (order.status.status !== OrderStatusEnum.PENDING) {
      throw new BadRequestException(
        `Cannot confirm order with status ${order.status.status}`,
      );
    }

    return await this.updateOrderStatus(orderId, OrderStatusEnum.CONFIRMED);
  }

  /**
   * Chuyển order sang trạng thái PROCESSING
   * Được gọi khi shop bắt đầu xử lý order
   */
  async processOrder(orderId: number): Promise<ShopOrder> {
    const order = await this.findById(orderId);

    // Chỉ process được order đã CONFIRMED
    if (order.status.status !== OrderStatusEnum.CONFIRMED) {
      throw new BadRequestException(
        `Cannot process order with status ${order.status.status}`,
      );
    }

    return await this.updateOrderStatus(orderId, OrderStatusEnum.PROCESSING);
  }

  /**
   * Chuyển order sang trạng thái SHIPPED
   */
  async shipOrder(orderId: number): Promise<ShopOrder> {
    const order = await this.findById(orderId);

    if (order.status.status !== OrderStatusEnum.PROCESSING) {
      throw new BadRequestException(
        `Cannot ship order with status ${order.status.status}`,
      );
    }

    return await this.updateOrderStatus(orderId, OrderStatusEnum.SHIPPED);
  }

  /**
   * Chuyển order sang trạng thái DELIVERED
   */
  async deliverOrder(orderId: number): Promise<ShopOrder> {
    const order = await this.findById(orderId);

    if (order.status.status !== OrderStatusEnum.SHIPPED) {
      throw new BadRequestException(
        `Cannot deliver order with status ${order.status.status}`,
      );
    }

    return await this.updateOrderStatus(orderId, OrderStatusEnum.DELIVERED);
  }

  /**
   * Hủy order
   * Có thể hủy khi order đang PENDING hoặc CONFIRMED
   */
  async cancelOrder(orderId: number, reason?: string): Promise<ShopOrder> {
    const order = await this.findById(orderId);

    // Không thể hủy order đã shipped hoặc delivered
    if (
      order.status.status === OrderStatusEnum.SHIPPED ||
      order.status.status === OrderStatusEnum.DELIVERED
    ) {
      throw new BadRequestException(
        `Cannot cancel order with status ${order.status.status}`,
      );
    }

    // Lưu lý do hủy vào notes nếu có
    if (reason) {
      order.notes = reason;
    }

    const cancelledStatus = await this.orderStatusRepo.findOne({
      where: { status: OrderStatusEnum.CANCELLED },
    });

    if (!cancelledStatus) {
      throw new BadRequestException('Order status not found');
    }

    order.status = cancelledStatus;

    return await this.orderRepo.save(order);
  }

  /**
   * Kiểm tra có thể hủy order không
   */
  async canCancelOrder(orderId: number): Promise<boolean> {
    const order = await this.findById(orderId);

    // Chỉ có thể hủy khi chưa shipped
    return (
      order.status.status !== OrderStatusEnum.SHIPPED &&
      order.status.status !== OrderStatusEnum.DELIVERED &&
      order.status.status !== OrderStatusEnum.CANCELLED
    );
  }

  async attachPaymentMethodToOrder(
    orderId: number,
    paymentMethod: UserPaymentMethod,
  ): Promise<ShopOrder> {
    const order = await this.findById(orderId);

    if (order.status.status !== OrderStatusEnum.PENDING) {
      throw new BadRequestException(
        `Cannot attach payment method to order with status ${order.status.status}`,
      );
    }

    order.paymentMethod = { id: paymentMethod.id } as any;

    return await this.orderRepo.save(order);
  }

  async canProcessPayment(orderId: number): Promise<boolean> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['paymentMethod', 'orderLines', 'status'],
    });

    if (!order) {
      return false;
    }

    if (order.status.status !== OrderStatusEnum.PENDING) {
      return false;
    }

    if (!order.paymentMethod) {
      return false;
    }

    if (order.orderLines.length == 0 || !order.orderLines) {
      return false;
    }

    if (!order.orderTotal || order.orderTotal <= 0) {
      return false;
    }
    return true;
  }

  // FILE: src/modules/orders/orders.service.ts

  async calculateOrderTotal(orderId: number): Promise<number> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['orderLines', 'orderLines.catSpec', 'shippingMethod'],
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    let subTotal = 0;
    if (order.orderLines && order.orderLines.length > 0) {
      subTotal = order.orderLines.reduce((sum, line) => {
        return sum + line.price * line.qty;
      }, 0);
    }

    let shippingFee = 0;
    if (order.shippingMethod) {
      shippingFee = (order.shippingMethod as any).price || 0;
    }

    // THÊM DÒNG NÀY VÀO CUỐI HÀM
    return subTotal + shippingFee;
  }

  /* ==================== USER ORDER METHODS ==================== */

  async findOrderForUser(userId: number, orderId: number): Promise<ShopOrder> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, user: { id: userId } },
      relations: [
        'orderLines',
        'orderLines.catSpec',
        'orderLines.catSpec.cat',
        'status',
        'shippingMethod',
        'address',
        'paymentMethod',
      ],
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    return order;
  }

  async cancelOrderByUser(
    userId: number,
    orderId: number,
    reason?: string,
  ): Promise<ShopOrder> {
    const isOwner = await this.validateOrderOwnership(orderId, userId);
    if (!isOwner) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    return this.cancelOrder(orderId, reason);
  }

  /* ==================== ADMIN ORDER METHODS ==================== */

  async findAllOrders(page: number = 1, limit: number = 10, status?: string) {
    const skip = (page - 1) * limit;

    const qb = this.orderRepo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('order.status', 'status')
      .leftJoinAndSelect('order.shippingMethod', 'shippingMethod')
      .leftJoinAndSelect('order.orderLines', 'orderLines');

    if (status) {
      qb.andWhere('status.status = :status', { status });
    }

    qb.orderBy('order.orderDate', 'DESC').skip(skip).take(limit);

    const [orders, total] = await qb.getManyAndCount();

    return {
      data: orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /* ==================== SHIPPING METHODS ==================== */

  async getShippingMethods(): Promise<ShippingMethod[]> {
    return this.shippingMethodRepo.find({
      where: { isActive: true },
      order: { price: 'ASC' },
    });
  }
}

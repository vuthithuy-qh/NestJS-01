import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cat } from '../entities/cat.entity';
import { CreateCatDto } from '../dto/create-cat.dto';
import { UpdateCatDto } from '../dto/update-cat.dto';
import { FilterCatDto } from '../dto/filter-cat.dto';
import { PaginatedCatResponseDto } from '../dto/paginated-cat-response.dto';
import { CatResponseDto } from '../dto/cat-response.dto';
import { CatSpecService } from './cat-spec.service';
import { CatRankingService } from './cat-ranking.service';
import { CloudinaryService } from 'src/providers/cloudinary/cloudinary.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationType } from '../../notifications/entities/notification.entity';

@Injectable()
export class CatsService {
  constructor(
    @InjectRepository(Cat)
    private catRepository: Repository<Cat>,
    private catSpecService: CatSpecService,
    private catRankingService: CatRankingService,
    private cloudinaryService: CloudinaryService,
    private notificationsService: NotificationsService,
  ) {}

  async create(createCatDto: CreateCatDto): Promise<CatResponseDto> {
    const { specs, ...catData } = createCatDto;

    // 1. Tạo cat (chỉ cat, không có spec)
    const cat = this.catRepository.create(catData);
    const savedCat = await this.catRepository.save(cat);

    // 2. Tạo specs (delegate to CatSpecService)
    if (specs && specs.length > 0) {
      await this.catSpecService.createBulk(savedCat.id, specs);
    }

    // 3. Send broadcast notification
    try {
      await this.notificationsService.createBroadcast(
        NotificationType.NEW_CAT,
        '🐱 Mèo mới!',
        `Mèo "${savedCat.name}" vừa được thêm vào cửa hàng!`,
        savedCat.image || undefined,
      );
    } catch (e) {
      // Don't fail cat creation if notification fails
    }

    // 4. Return full cat with specs
    return this.findOne(savedCat.id);
  }

  async findAll(filterDto: FilterCatDto): Promise<PaginatedCatResponseDto> {
    const {
      categoryId,
      status,
      gender,
      search,
      minPrice,
      maxPrice,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = filterDto;

    const allowedCatFields = [
      'id',
      'name',
      'createdAt',
      'updatedAt',
      'status',
      'gender',
    ];
    const validSortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';

    // ===== BƯỚC 1: Lấy danh sách ID đã phân trang + sắp xếp =====
    const idsQuery = this.catRepository
      .createQueryBuilder('cat')
      .select('cat.id', 'id');

    // Join specs chỉ khi cần filter/sort theo price
    if (
      sortBy === 'price' ||
      minPrice !== undefined ||
      maxPrice !== undefined
    ) {
      idsQuery.leftJoin('cat.specs', 'specs');
    }

    // Filters
    if (categoryId) {
      idsQuery.andWhere('cat.categoryId = :categoryId', { categoryId });
    }
    if (status) {
      idsQuery.andWhere('cat.status = :status', { status });
    }
    if (gender) {
      idsQuery.andWhere('cat.gender = :gender', { gender });
    }
    if (search) {
      idsQuery.andWhere(
        '(cat.name LIKE :search OR cat.description LIKE :search)',
        { search: `%${search}%` },
      );
    }
    if (minPrice !== undefined) {
      idsQuery.andWhere('specs.price >= :minPrice', { minPrice });
    }
    if (maxPrice !== undefined) {
      idsQuery.andWhere('specs.price <= :maxPrice', { maxPrice });
    }

    // Group by (luôn group để tránh duplicate khi join specs)
    idsQuery.groupBy('cat.id');

    // ===== SORT BY RANK: special flow =====
    if (sortBy === 'rank') {
      // 1. Get all filtered IDs (no pagination/sorting yet)
      const allFilteredResult = await idsQuery.getRawMany();
      const allFilteredIds = allFilteredResult.map((r) => Number(r.id));
      const total = allFilteredIds.length;

      // 2. Get rank order from CatRankingService
      const rankedIds = await this.catRankingService.getRankedCatIds(99999);
      const rankMap = new Map(rankedIds.map((id, idx) => [id, idx]));

      // 3. Sort filtered IDs by rank position
      allFilteredIds.sort(
        (a, b) => (rankMap.get(a) ?? 99999) - (rankMap.get(b) ?? 99999),
      );

      // 4. Paginate
      const skip = (page - 1) * limit;
      const catIds = allFilteredIds.slice(skip, skip + limit);

      // 5. Fetch full data
      let cats: Cat[] = [];
      if (catIds.length > 0) {
        cats = await this.catRepository
          .createQueryBuilder('cat')
          .leftJoinAndSelect('cat.category', 'category')
          .leftJoinAndSelect('cat.specs', 'specs')
          .leftJoinAndSelect('specs.configurations', 'configurations')
          .leftJoinAndSelect('configurations.variantOption', 'variantOption')
          .leftJoinAndSelect('variantOption.variant', 'variant')
          .whereInIds(catIds)
          .getMany();

        // Preserve rank order
        const catMap = new Map(cats.map((c) => [c.id, c]));
        cats = catIds.map((id) => catMap.get(id)).filter((c): c is Cat => !!c);
      }

      const data = cats.map((cat) => this.mapToResponseDto(cat));
      return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
    }

    // ===== Normal sorting (price, createdAt, name, etc.) =====
    if (sortBy === 'price') {
      idsQuery.addSelect('MIN(specs.price)', 'minPrice');
      idsQuery.orderBy('minPrice', validSortOrder);
    } else if (allowedCatFields.includes(sortBy)) {
      idsQuery.orderBy(`cat.${sortBy}`, validSortOrder);
    } else {
      idsQuery.orderBy('cat.createdAt', 'DESC');
    }

    // Đếm tổng (trước khi phân trang)
    const total = await idsQuery.getCount();

    // Phân trang
    const skip = (page - 1) * limit;
    idsQuery.offset(skip).limit(limit);

    const idsResult = await idsQuery.getRawMany();
    const catIds = idsResult.map((r) => Number(r.id));

    // ===== BƯỚC 2: Lấy đầy đủ data theo IDs =====
    let cats: Cat[] = [];

    if (catIds.length > 0) {
      const dataQuery = this.catRepository
        .createQueryBuilder('cat')
        .leftJoinAndSelect('cat.category', 'category')
        .leftJoinAndSelect('cat.specs', 'specs')
        .leftJoinAndSelect('specs.configurations', 'configurations')
        .leftJoinAndSelect('configurations.variantOption', 'variantOption')
        .leftJoinAndSelect('variantOption.variant', 'variant')
        .whereInIds(catIds);

      // Giữ nguyên thứ tự sort
      if (sortBy === 'price') {
        // Đã sort theo giá ở idsQuery; dataQuery chỉ load full relations theo IDs.
      } else if (allowedCatFields.includes(sortBy)) {
        dataQuery.orderBy(`cat.${sortBy}`, validSortOrder);
      } else {
        dataQuery.orderBy('cat.createdAt', 'DESC');
      }

      cats = await dataQuery.getMany();

      // Sắp xếp lại theo thứ tự IDs nếu sort by price
      if (sortBy === 'price') {
        cats.sort((a, b) => catIds.indexOf(a.id) - catIds.indexOf(b.id));
      }
    }

    // Map to response DTO
    const data = cats.map((cat) => this.mapToResponseDto(cat));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number): Promise<CatResponseDto> {
    const cat = await this.catRepository.findOne({
      where: { id },
      relations: [
        'category',
        'specs',
        'specs.configurations',
        'specs.configurations.variantOption',
        'specs.configurations.variantOption.variant',
      ],
    });

    if (!cat) {
      throw new NotFoundException(`Cat with ID ${id} not found`);
    }

    return this.mapToResponseDto(cat);
  }

  async update(
    id: number,
    updateCatDto: UpdateCatDto,
  ): Promise<CatResponseDto> {
    const cat = await this.catRepository.findOne({ where: { id } });

    if (!cat) {
      throw new NotFoundException(`Cat with ID ${id} not found`);
    }

    const { specs, ...catData } = updateCatDto;

    // 1. Update cat data (chỉ cat)
    Object.assign(cat, catData);
    await this.catRepository.save(cat);

    // 2. Update specs nếu có (delegate to CatSpecService)
    if (specs !== undefined) {
      // Xóa specs cũ
      await this.catSpecService.deleteByCatId(id);

      // Tạo specs mới
      if (specs.length > 0) {
        await this.catSpecService.createBulk(id, specs);
      }
    }

    return this.findOne(id);
  }

  async remove(id: number): Promise<{ message: string }> {
    const cat = await this.catRepository.findOne({ where: { id } });

    if (!cat) {
      throw new NotFoundException(`Cat with ID ${id} not found`);
    }

    // Soft delete cat (specs sẽ bị cascade soft delete nếu có)
    await this.catRepository.softRemove(cat);

    return { message: `Cat with ID ${id} has been soft deleted` };
  }

  async restore(id: number): Promise<CatResponseDto> {
    const cat = await this.catRepository.findOne({
      where: { id },
      withDeleted: true,
    });

    if (!cat) {
      throw new NotFoundException(`Cat with ID ${id} not found`);
    }

    if (!cat.deletedAt) {
      throw new BadRequestException(`Cat with ID ${id} is not deleted`);
    }

    await this.catRepository.restore(id);

    return this.findOne(id);
  }

  async hardDelete(id: number): Promise<{ message: string }> {
    const cat = await this.catRepository.findOne({
      where: { id },
      withDeleted: true,
    });

    if (!cat) {
      throw new NotFoundException(`Cat with ID ${id} not found`);
    }

    // Xóa specs trước (delegate to CatSpecService)
    await this.catSpecService.deleteByCatId(id);

    // Xóa cat
    await this.catRepository.remove(cat);

    return { message: `Cat with ID ${id} has been permanently deleted` };
  }

  private mapToResponseDto(cat: Cat): CatResponseDto {
    return {
      id: cat.id,
      categoryId: cat.categoryId,
      categoryName: cat.category?.name || '',
      name: cat.name,
      description: cat.description,
      image: cat.image,
      status: cat.status,
      gender: cat.gender,
      specs:
        cat.specs?.map((spec) => ({
          id: spec.id,
          sku: spec.sku,
          price: Number(spec.price),
          qtyInStock: spec.qtyInStock,
          catImage: spec.catImage,
          configurations:
            spec.configurations?.map((config) => ({
              id: config.variantOption.id,
              variantId: config.variantOption.variantId,
              variantName: config.variantOption.variant?.name || '',
              value: config.variantOption.value,
            })) || [],
        })) || [],
      createdAt: cat.createdAt,
      updatedAt: cat.updatedAt,
    };
  }

  /**
   * Find related cats: same category first, then fill with ranked/recent.
   * Excludes the given cat from results.
   */
  async findRelated(
    catId: number,
    limit = 8,
  ): Promise<CatResponseDto[]> {
    const cat = await this.catRepository.findOne({ where: { id: catId } });
    if (!cat) throw new NotFoundException(`Cat with ID ${catId} not found`);

    // 1. Same category (excluding current cat), random order
    const sameCategoryQuery = this.catRepository
      .createQueryBuilder('cat')
      .leftJoinAndSelect('cat.category', 'category')
      .leftJoinAndSelect('cat.specs', 'specs')
      .leftJoinAndSelect('specs.configurations', 'configurations')
      .leftJoinAndSelect('configurations.variantOption', 'variantOption')
      .leftJoinAndSelect('variantOption.variant', 'variant')
      .where('cat.id != :catId', { catId })
      .andWhere('cat.categoryId = :categoryId', {
        categoryId: cat.categoryId,
      })
      .orderBy('RAND()')
      .take(limit);

    const sameCategoryCats = await sameCategoryQuery.getMany();

    // 2. If not enough, fill with other cats (different category)
    let results = sameCategoryCats;
    if (results.length < limit) {
      const excludeIds = [catId, ...results.map((c) => c.id)];
      const fillQuery = this.catRepository
        .createQueryBuilder('cat')
        .leftJoinAndSelect('cat.category', 'category')
        .leftJoinAndSelect('cat.specs', 'specs')
        .leftJoinAndSelect('specs.configurations', 'configurations')
        .leftJoinAndSelect('configurations.variantOption', 'variantOption')
        .leftJoinAndSelect('variantOption.variant', 'variant')
        .where('cat.id NOT IN (:...excludeIds)', { excludeIds })
        .orderBy('RAND()')
        .take(limit - results.length);

      const fillCats = await fillQuery.getMany();
      results = [...results, ...fillCats];
    }

    return results.map((c) => this.mapToResponseDto(c));
  }

  /**
   * Find cats by an ordered array of IDs.
   * Preserves the order of the input IDs (for ranked results).
   */
  async findByIds(ids: number[]): Promise<{ data: CatResponseDto[] }> {
    if (ids.length === 0) return { data: [] };

    const cats = await this.catRepository
      .createQueryBuilder('cat')
      .leftJoinAndSelect('cat.category', 'category')
      .leftJoinAndSelect('cat.specs', 'specs')
      .leftJoinAndSelect('specs.configurations', 'configurations')
      .leftJoinAndSelect('configurations.variantOption', 'variantOption')
      .leftJoinAndSelect('variantOption.variant', 'variant')
      .whereInIds(ids)
      .getMany();

    // Preserve the ranked order from input IDs
    const catMap = new Map(cats.map((c) => [c.id, c]));
    const ordered = ids
      .map((id) => catMap.get(id))
      .filter((c): c is Cat => !!c);

    return { data: ordered.map((cat) => this.mapToResponseDto(cat)) };
  }

  async uploadImage(catId: number, file: Express.Multer.File) {
    const cat = await this.catRepository.findOneBy({ id: catId });
    if (!cat) {
      throw new NotFoundException(`Không tìm thấy mèo với id ${catId}`);
    }

    // Xóa ảnh cũ trên Cloudinary (nếu có)
    if (cat.image) {
      const publicId = this.cloudinaryService.extractPublicId(cat.image);
      if (publicId) {
        await this.cloudinaryService.deleteImage(publicId);
      }
    }

    // Upload ảnh mới
    const result = await this.cloudinaryService.uploadImage(
      file,
      'petshop/cats',
    );

    // Lưu URL vào DB
    cat.image = result.secure_url;
    await this.catRepository.save(cat);

    return {
      message: 'Upload ảnh thành công!',
      imageUrl: result.secure_url,
    };
  }
}

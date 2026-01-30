import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cat } from '../entities/cat.entity';
import { CreateCatDto } from '../dto/create-cat.dto';
import { UpdateCatDto } from '../dto/update-cat.dto';
import { FilterCatDto } from '../dto/filter-cat.dto';
import { PaginatedCatResponseDto } from '../dto/paginated-cat-response.dto';
import { CatResponseDto } from '../dto/cat-response.dto';
import { CatSpecService } from './cat-spec.service';

@Injectable()
export class CatsService {
    constructor(
        @InjectRepository(Cat)
        private catRepository: Repository<Cat>,
        private catSpecService: CatSpecService,
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

        // 3. Return full cat with specs
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

        const queryBuilder = this.catRepository
            .createQueryBuilder('cat')
            .leftJoinAndSelect('cat.category', 'category')
            .leftJoinAndSelect('cat.specs', 'specs')
            .leftJoinAndSelect('specs.configurations', 'configurations')
            .leftJoinAndSelect('configurations.variantOption', 'variantOption')
            .leftJoinAndSelect('variantOption.variant', 'variant');

        // Filters
        if (categoryId) {
            queryBuilder.andWhere('cat.categoryId = :categoryId', { categoryId });
        }

        if (status) {
            queryBuilder.andWhere('cat.status = :status', { status });
        }

        if (gender) {
            queryBuilder.andWhere('cat.gender = :gender', { gender });
        }

        if (search) {
            queryBuilder.andWhere(
                '(cat.name LIKE :search OR cat.description LIKE :search)',
                { search: `%${search}%` },
            );
        }

        if (minPrice !== undefined || maxPrice !== undefined) {
            if (minPrice !== undefined) {
                queryBuilder.andWhere('specs.price >= :minPrice', { minPrice });
            }

            if (maxPrice !== undefined) {
                queryBuilder.andWhere('specs.price <= :maxPrice', { maxPrice });
            }
        }

        // Pagination
        const skip = (page - 1) * limit;
        queryBuilder.skip(skip).take(limit);

        // Sorting
        queryBuilder.orderBy(`cat.${sortBy}`, sortOrder);

        const [cats, total] = await queryBuilder.getManyAndCount();

        // Map to response DTO
        const data = cats.map(cat => this.mapToResponseDto(cat));

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

    async update(id: number, updateCatDto: UpdateCatDto): Promise<CatResponseDto> {
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
            specs: cat.specs?.map(spec => ({
                id: spec.id,
                sku: spec.sku,
                price: Number(spec.price),
                qtyInStock: spec.qtyInStock,
                catImage: spec.catImage,
                configurations: spec.configurations?.map(config => ({
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
}
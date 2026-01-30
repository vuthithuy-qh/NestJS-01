import {BadRequestException, Injectable, NotFoundException} from '@nestjs/common';
import {CreatePromotionDto} from './dto/create-promotion.dto';
import {InjectRepository} from "@nestjs/typeorm";
import {Promotion} from "./entities/promotion.entity";
import {LessThanOrEqual, MoreThanOrEqual, Repository} from "typeorm";
import {PromotionCategory} from "./entities/PromotionCategory.enitty";
import {Category} from "../category/entities/category.entity";
import {PromotionResponseDto} from "./dto/promotion-response.dto";
import {DiscountType} from "./enum/discount-type.enum";
import {UpdatePromotionDto} from "./dto/update-promotion.dto";

@Injectable()
export class PromotionService {

    constructor(
        @InjectRepository(Promotion)
        private promotionRepository: Repository<Promotion>,
        @InjectRepository(PromotionCategory)
        private promotionCategoryRepository: Repository<PromotionCategory>,
        @InjectRepository(Category)
        private categoryRepository: Repository<Category>,
    ) {
    }

    async create(createPromotionDto: CreatePromotionDto): Promise<PromotionResponseDto>{
        const {categoryIds, ...promotionData} = createPromotionDto;

        //validate dates
        const startDate = new Date(promotionData.startDate);
        const endDate = new Date(promotionData.endDate);

        if(startDate >= endDate){
            throw new BadRequestException('End date must be after start date');
        }

        ///validate discount base on type
        if(promotionData.discountType === DiscountType.PERCENTAGE) {
            if(!createPromotionDto.discountRate) {
                throw new BadRequestException('Discount rate is required for percentage discount type');
            }

            if(createPromotionDto.discountRate < 0 || createPromotionDto.discountRate > 100) {
                throw new BadRequestException('Discount rate must be between 0 and 100');
            }

        }else if(promotionData.discountType === DiscountType.FIXED) {
            if(!createPromotionDto.discountAmount) {
                throw new BadRequestException('Discount amount is required for fixed discount type');
            }

            if(createPromotionDto.discountAmount < 0) {
                throw new BadRequestException('Discount amount must be greater than or equal to 0');
            }
        }


        // validate categories exits

        if(categoryIds && categoryIds.length > 0) {
            const categories = await this.categoryRepository.findByIds(categoryIds);
            if(categories.length !== categoryIds.length) {
                throw new BadRequestException('Some categories not found');
            }
        }

        //create promotion
        const promotion = this.promotionRepository.create({
            ...promotionData,
            startDate,
            endDate
        });
        const savedPromotion = await this.promotionRepository.save(promotion);

        //create promotion categories
        if (categoryIds && categoryIds.length > 0) {
            const promotionCategories = categoryIds.map(categoryId =>
                this.promotionCategoryRepository.create({
                    promotionId: savedPromotion.id,
                    categoryId,
                }),
            );
            await this.promotionCategoryRepository.save(promotionCategories);
        }

        return this.findOne(savedPromotion.id);

    }

    async findAll(isActive?: boolean): Promise<PromotionResponseDto[]> {
        const queryBuilder = this.promotionRepository
            .createQueryBuilder('promotion')
            .leftJoinAndSelect('promotion.promotionCategories', 'promotionCategories')
            .leftJoinAndSelect('promotionCategories.category', 'category');

        if(isActive !== undefined){
            queryBuilder.andWhere('promotion.isActive = :isActive', {isActive});

        }

        queryBuilder.orderBy('promotion.createdAt', 'DESC');

        const promotions = await queryBuilder.getMany();

        return promotions.map(promotion => this.mapToResponseDto(promotion));
    }

    async findActive(): Promise<PromotionResponseDto[]> {
        const now = new Date();

        const promotions = await this.promotionRepository.find({
            where: {
                isActive: true,
                startDate: LessThanOrEqual(now),
                endDate: MoreThanOrEqual(now)
            }, relations: ['promotionCategories', 'promotionCategories.category'],
        });

        return promotions.map(promotion => this.mapToResponseDto(promotion));

    }

    async findOne(id: number): Promise<PromotionResponseDto> {
        const promotion = await this.promotionRepository.findOne({
            where: {id} ,
            relations: ['promotionCategories', 'promotionCategories.category'],
        })

        if(!promotion) {
            throw new NotFoundException(`Promotion with id ${id} not found`);
        }

        return this.mapToResponseDto(promotion);
    }

    async findByCategory(categoryId: number): Promise<PromotionResponseDto[]> {
        const now = new Date();

        const promotionCategories = await this.promotionCategoryRepository.find({
            where: {categoryId},
            relations: ['promotion', 'promotion.promotionCategories', 'promotion.promotionCategories.category'],
        });

        const promotions = promotionCategories.map(pc => pc.promotion)
            .filter(promotion => promotion.isActive && new Date(promotion.startDate) <= now &&
            new Date(promotion.endDate) >= now);

        //remove duplicates
        const uniquePromotions = Array.from(new Map(promotions.map(p => [p.id, p])).values());

        return uniquePromotions.map(promotion => this.mapToResponseDto(promotion))

    }

    async update(id: number, updatePromotionDto: UpdatePromotionDto): Promise<PromotionResponseDto> {
        const promotion = await this.promotionRepository.findOne({
            where: {id}
        });

        if(!promotion) {
            throw new NotFoundException(`Promotion with id ${id} not found`);
        }

        const {categoryIds, ...promotionData} = updatePromotionDto;

        if(promotionData.startDate || promotionData.endDate) {
            const startDate = promotionData.startDate
                ? new Date(promotionData.startDate) : promotionData.startDate;

            const endDate = promotionData.endDate
            ? new Date(promotionData.endDate)
            : promotionData.endDate;

            if (startDate && endDate) {
                if (startDate >= endDate) {
                    throw new BadRequestException(
                        'Start date must be before end date',
                    );
                }
            }

            if(promotionData.startDate){
                promotionData.startDate = new Date(promotionData.startDate) as any;
            }

            if(promotionData.endDate){
                promotionData.endDate = new Date(promotionData.endDate) as any;
            }
        }

        //update promotion
        Object.assign(promotion, promotionData);

        await this.promotionRepository.save(promotion);

        if(categoryIds !== undefined){
            if(categoryIds.length > 0) {
                const categories = await this.categoryRepository.findByIds(categoryIds);

                if(categories.length !== categoryIds.length){
                    throw new BadRequestException('Some categories not found');
                }
            }

            //delete old promotion categories
            await this.promotionCategoryRepository.delete({promotionId: id})


            //create new relations
            if(categoryIds.length > 0) {
                const promotionCategories = categoryIds.map(categoryId =>
                this.promotionCategoryRepository.create({
                    promotionId: id,
                    categoryId,
                }),
                );

                await this.promotionCategoryRepository.save(promotionCategories);
            }

        }

        return this.findOne(id);


    }

    async remove(id: number): Promise<{ message: string }> {
        const promotion = await this.promotionRepository.findOne({ where: { id } });

        if (!promotion) {
            throw new NotFoundException(`Promotion with ID ${id} not found`);
        }

        await this.promotionRepository.softRemove(promotion);

        return { message: `Promotion with ID ${id} has been soft deleted` };
    }

    async restore(id: number): Promise<PromotionResponseDto> {
        const promotion = await this.promotionRepository.findOne({
            where: { id },
            withDeleted: true,
        });

        if (!promotion) {
            throw new NotFoundException(`Promotion with ID ${id} not found`);
        }

        if (!promotion.deletedAt) {
            throw new BadRequestException(`Promotion with ID ${id} is not deleted`);
        }

        await this.promotionRepository.restore(id);

        return this.findOne(id);
    }

    async hardDelete(id: number): Promise<{ message: string }> {
        const promotion = await this.promotionRepository.findOne({
            where: { id },
            withDeleted: true,
        });

        if (!promotion) {
            throw new NotFoundException(`Promotion with ID ${id} not found`);
        }

        // Delete promotion categories first
        await this.promotionCategoryRepository.delete({ promotionId: id });

        // Delete promotion
        await this.promotionRepository.remove(promotion);

        return { message: `Promotion with ID ${id} has been permanently deleted` };
    }

    async toggleActive(id: number): Promise<PromotionResponseDto> {
        const promotion = await this.promotionRepository.findOne({ where: { id } });

        if (!promotion) {
            throw new NotFoundException(`Promotion with ID ${id} not found`);
        }

        promotion.isActive = !promotion.isActive;
        await this.promotionRepository.save(promotion);

        return this.findOne(id);
    }

    calculateDiscount(price: number, promotion: Promotion): number {
        if(promotion.discountType === DiscountType.PERCENTAGE) {
            return (price * Number(promotion.discountRate))/100;
        }else {
            return Math.min(Number(promotion.discountAmount), price);
        }
    }


    calculatePriceAfterDiscount(price: number, promotion: Promotion): number {
        const discount = this.calculateDiscount(price, promotion);
        return Math.max(0, price - discount);
    }




    private mapToResponseDto(promotion: Promotion): PromotionResponseDto {
        return {
            id: promotion.id,
            name: promotion.name,
            description: promotion.description,
            discountType: promotion.discountType,
            discountRate: Number(promotion.discountRate),
            discountAmount: Number(promotion.discountAmount),
            startDate: promotion.startDate,
            endDate: promotion.endDate,
            isActive: promotion.isActive,
            categories: promotion.promotionCategories?.map(pc => ({
                id: pc.id,
                categoryId: pc.categoryId,
                categoryName: pc.category?.name || '',
            })) || [],
            createdAt: promotion.createdAt,
            updatedAt: promotion.updatedAt,
        };
    }

}

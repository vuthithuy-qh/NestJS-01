import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Variant } from '../entities/variant.entity';
import { VariantOption } from '../entities/variant-option.entity';
import { CreateVariantDto } from '../dto/create-variant.dto';
import {UpdateVariantDto} from "../dto/update-variant.dto";
import { CreateVariantOptionDto } from '../dto/create-variant-option.dto';
import {UpdateVariantOptionDto} from "../dto/update-variant-option.dto";

@Injectable()
export class VariantService {
    constructor(
        @InjectRepository(Variant)
        private variantRepository: Repository<Variant>,
        @InjectRepository(VariantOption)
        private variantOptionRepository: Repository<VariantOption>,
    ) {}

    // ========== VARIANT CRUD ==========

    async createVariant(createDto: CreateVariantDto): Promise<Variant> {
        const { options, ...variantData } = createDto;

        // Create variant
        const variant = this.variantRepository.create(variantData);
        const savedVariant = await this.variantRepository.save(variant);

        // Create options if provided
        if (options && options.length > 0) {
            for (const optionDto of options) {
                await this.createVariantOption({
                    variantId: savedVariant.id,
                    value: optionDto.value,
                });
            }
        }

        return this.findVariantById(savedVariant.id);
    }

    async findAllVariants(categoryId?: number): Promise<Variant[]> {
        const queryBuilder = this.variantRepository
            .createQueryBuilder('variant')
            .leftJoinAndSelect('variant.category', 'category')
            .leftJoinAndSelect('variant.options', 'options');

        if (categoryId) {
            queryBuilder.where('variant.categoryId = :categoryId', { categoryId });
        }

        return await queryBuilder.getMany();
    }

    async findVariantById(id: number): Promise<Variant> {
        const variant = await this.variantRepository.findOne({
            where: { id },
            relations: ['category', 'options'],
        });

        if (!variant) {
            throw new NotFoundException(`Variant with ID ${id} not found`);
        }

        return variant;
    }

    async updateVariant(id: number, updateDto: UpdateVariantDto): Promise<Variant> {
        const variant = await this.variantRepository.findOne({ where: { id } });

        if (!variant) {
            throw new NotFoundException(`Variant with ID ${id} not found`);
        }

        Object.assign(variant, updateDto);
        await this.variantRepository.save(variant);

        return this.findVariantById(id);
    }

    async removeVariant(id: number): Promise<{ message: string }> {
        const variant = await this.variantRepository.findOne({
            where: { id },
            relations: ['options'],
        });

        if (!variant) {
            throw new NotFoundException(`Variant with ID ${id} not found`);
        }

        // Check if variant has options
        if (variant.options && variant.options.length > 0) {
            throw new BadRequestException('Cannot delete variant with options. Delete options first.');
        }

        await this.variantRepository.remove(variant);

        return { message: `Variant with ID ${id} has been deleted` };
    }

    // ========== VARIANT OPTION CRUD ==========

    async createVariantOption(createDto: CreateVariantOptionDto): Promise<VariantOption> {
        // Check variant exists
        const variant = await this.variantRepository.findOne({
            where: { id: createDto.variantId },
        });

        if (!variant) {
            throw new NotFoundException(`Variant with ID ${createDto.variantId} not found`);
        }

        const option = this.variantOptionRepository.create(createDto);
        return await this.variantOptionRepository.save(option);
    }

    async findAllVariantOptions(variantId?: number): Promise<VariantOption[]> {
        const queryBuilder = this.variantOptionRepository
            .createQueryBuilder('option')
            .leftJoinAndSelect('option.variant', 'variant');

        if (variantId) {
            queryBuilder.where('option.variantId = :variantId', { variantId });
        }

        return await queryBuilder.getMany();
    }

    async findVariantOptionById(id: number): Promise<VariantOption> {
        const option = await this.variantOptionRepository.findOne({
            where: { id },
            relations: ['variant'],
        });

        if (!option) {
            throw new NotFoundException(`Variant Option with ID ${id} not found`);
        }

        return option;
    }

    async updateVariantOption(id: number, updateDto: UpdateVariantOptionDto): Promise<VariantOption> {
        const option = await this.variantOptionRepository.findOne({ where: { id } });

        if (!option) {
            throw new NotFoundException(`Variant Option with ID ${id} not found`);
        }

        Object.assign(option, updateDto);
        await this.variantOptionRepository.save(option);

        return this.findVariantOptionById(id);
    }

    async removeVariantOption(id: number): Promise<{ message: string }> {
        const option = await this.variantOptionRepository.findOne({ where: { id } });

        if (!option) {
            throw new NotFoundException(`Variant Option with ID ${id} not found`);
        }

        await this.variantOptionRepository.remove(option);

        return { message: `Variant Option with ID ${id} has been deleted` };
    }
}
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CatSpec } from '../entities/cat-spec.entity';
import { CatConfiguration } from '../entities/cat-configuration.entity';
import { VariantOption } from '../entities/variant-option.entity';
import { CreateCatSpecDto } from '../dto/create-cat-spec.dto';
import { UpdateCatSpecDto } from '../dto/update-cat-spec.dto';
import { CatSpecInCatDto } from '../dto/create-cat.dto';

@Injectable()
export class CatSpecService {
    constructor(
        @InjectRepository(CatSpec)
        private catSpecRepository: Repository<CatSpec>,
        @InjectRepository(CatConfiguration)
        private catConfigRepository: Repository<CatConfiguration>,
        @InjectRepository(VariantOption)
        private variantOptionRepository: Repository<VariantOption>,
    ) {}

    async create(createDto: CreateCatSpecDto): Promise<CatSpec> {
        const { variantOptionIds, ...specData } = createDto;

        // Validate variant options exist
        if (variantOptionIds && variantOptionIds.length > 0) {
            const options = await this.variantOptionRepository.findByIds(variantOptionIds);
            if (options.length !== variantOptionIds.length) {
                throw new BadRequestException('Some variant options not found');
            }
        }

        // Check SKU unique
        const existingSpec = await this.catSpecRepository.findOne({
            where: { sku: specData.sku },
        });

        if (existingSpec) {
            throw new BadRequestException(`SKU "${specData.sku}" already exists`);
        }

        // Create cat spec
        const catSpec = this.catSpecRepository.create(specData);
        const savedSpec = await this.catSpecRepository.save(catSpec);

        // Create configurations
        if (variantOptionIds && variantOptionIds.length > 0) {
            await this.createConfigurations(savedSpec.id, variantOptionIds);
        }

        return this.findOne(savedSpec.id);
    }

    async findAll(catId?: number): Promise<CatSpec[]> {
        const queryBuilder = this.catSpecRepository
            .createQueryBuilder('spec')
            .leftJoinAndSelect('spec.cat', 'cat')
            .leftJoinAndSelect('spec.configurations', 'configurations')
            .leftJoinAndSelect('configurations.variantOption', 'variantOption')
            .leftJoinAndSelect('variantOption.variant', 'variant');

        if (catId) {
            queryBuilder.where('spec.catId = :catId', { catId });
        }

        return await queryBuilder.getMany();
    }

    async findOne(id: number): Promise<CatSpec> {
        const spec = await this.catSpecRepository.findOne({
            where: { id },
            relations: [
                'cat',
                'configurations',
                'configurations.variantOption',
                'configurations.variantOption.variant',
            ],
        });

        if (!spec) {
            throw new NotFoundException(`Cat Spec with ID ${id} not found`);
        }

        return spec;
    }

    async findBySku(sku: string): Promise<CatSpec> {
        const spec = await this.catSpecRepository.findOne({
            where: { sku },
            relations: [
                'cat',
                'configurations',
                'configurations.variantOption',
                'configurations.variantOption.variant',
            ],
        });

        if (!spec) {
            throw new NotFoundException(`Cat Spec with SKU "${sku}" not found`);
        }

        return spec;
    }

    async update(id: number, updateDto: UpdateCatSpecDto): Promise<CatSpec> {
        const spec = await this.catSpecRepository.findOne({ where: { id } });

        if (!spec) {
            throw new NotFoundException(`Cat Spec with ID ${id} not found`);
        }

        const { variantOptionIds, ...specData } = updateDto;

        // Check SKU unique if changed
        if (specData.sku && specData.sku !== spec.sku) {
            const existingSpec = await this.catSpecRepository.findOne({
                where: { sku: specData.sku },
            });

            if (existingSpec) {
                throw new BadRequestException(`SKU "${specData.sku}" already exists`);
            }
        }

        // Update spec data
        Object.assign(spec, specData);
        await this.catSpecRepository.save(spec);

        // Update configurations if provided
        if (variantOptionIds !== undefined) {
            // Delete old configurations
            await this.catConfigRepository.delete({ catSpecId: id });

            // Create new configurations
            if (variantOptionIds.length > 0) {
                await this.createConfigurations(id, variantOptionIds);
            }
        }

        return this.findOne(id);
    }

    async remove(id: number): Promise<{ message: string }> {
        const spec = await this.catSpecRepository.findOne({ where: { id } });

        if (!spec) {
            throw new NotFoundException(`Cat Spec with ID ${id} not found`);
        }

        // Delete configurations first
        await this.catConfigRepository.delete({ catSpecId: id });

        // Delete spec
        await this.catSpecRepository.remove(spec);

        return { message: `Cat Spec with ID ${id} has been deleted` };
    }

    async updateStock(id: number, quantity: number): Promise<CatSpec> {
        const spec = await this.catSpecRepository.findOne({ where: { id } });

        if (!spec) {
            throw new NotFoundException(`Cat Spec with ID ${id} not found`);
        }

        if (spec.qtyInStock + quantity < 0) {
            throw new BadRequestException('Insufficient stock');
        }

        spec.qtyInStock += quantity;
        await this.catSpecRepository.save(spec);

        return this.findOne(id);
    }

    async createBulk(catId: number, specs: CatSpecInCatDto[]): Promise<CatSpec[]> {
        const createdSpecs: CatSpec[] = [];

        for (const specDto of specs) {
            const spec = await this.create({
                ...specDto,
                catId,
            });
            createdSpecs.push(spec);
        }

        return createdSpecs;
    }

    async deleteByCatId(catId: number): Promise<void> {
        const specs = await this.catSpecRepository.find({ where: { catId } });

        for (const spec of specs) {
            await this.catConfigRepository.delete({ catSpecId: spec.id });
        }

        await this.catSpecRepository.delete({ catId });
    }

    private async createConfigurations(catSpecId: number, variantOptionIds: number[]): Promise<void> {
        const configurations = variantOptionIds.map(optionId =>
            this.catConfigRepository.create({
                catSpecId,
                variantOptionId: optionId,
            }),
        );

        await this.catConfigRepository.save(configurations);
    }
}
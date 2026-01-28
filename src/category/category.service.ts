import {Injectable, NotFoundException} from "@nestjs/common";
import {InjectRepository} from "@nestjs/typeorm";
import {Category} from "./entities/category.entity";
import {Repository} from "typeorm";
import {CreateCategoryDto} from "./dto/create-category.dto";

@Injectable()
export class CategoryService{

    constructor(
        @InjectRepository(Category)
        private categoryRepository: Repository<Category>,
    ) {}

    async create(createCategoryDto: CreateCategoryDto): Promise<Category>{
        const category = this.categoryRepository.create(createCategoryDto);
        return await this.categoryRepository.save(category);
    }

    async findAll(): Promise<Category[]>{
        return  await this.categoryRepository.find();
    }

    async findOne(id: number): Promise<Category> {
        const category = await this.categoryRepository.findOne({where : {id}});
        if(!category){
            throw new NotFoundException('Category not found');
        }
        return category;
    }
}
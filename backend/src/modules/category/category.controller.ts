import {CategoryService} from "./category.service";
import {Body, Controller, Get, Param, Post} from "@nestjs/common";
import {CreateCategoryDto} from "./dto/create-category.dto";
import {Roles} from "../auth/decorators/roles.decorator";
import {UserRole} from "../users/enum/user-role.enum";
import {Public} from "../auth/decorators/public.decorator";


@Controller('categories')
export class CategoryController {
    constructor(private readonly categoryService: CategoryService) {
    }


    @Post()
    @Roles(UserRole.ADMIN)
    create(@Body() createCategoryDto: CreateCategoryDto){
        return this.categoryService.create(createCategoryDto)
    }

    @Get()
    @Public()
    findAll(){
        return this.categoryService.findAll();
    }

    @Get(':id')
    @Public()
    findOne(@Param('id') id: string){
        return this.categoryService.findOne(+id);
    }

}
import {CatsService} from "../services/cats.service";
import {Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query} from "@nestjs/common";
import {ApiResponse, ApiTags} from "@nestjs/swagger";
import {CreateCatDto} from "../dto/create-cat.dto";
import { HttpCode, HttpStatus } from '@nestjs/common';
import {FilterCatDto} from "../dto/filter-cat.dto";
import {UpdateCatDto} from "../dto/update-cat.dto";
import {Roles} from "../../auth/decorators/roles.decorator";
import {UserRole} from "../../users/enum/user-role.enum";

@ApiTags('cats')
@Controller('cats')
export class CatsController {

    constructor( private readonly catsService : CatsService) {
    }

    @Post()
    @Roles(UserRole.ADMIN)
    @HttpCode(HttpStatus.CREATED)
    create(@Body() createCatDto: CreateCatDto){
        return this.catsService.create(createCatDto)
    }


    @Get()
    findAll(@Query() filterDto: FilterCatDto){
        return this.catsService.findAll(filterDto);
    }

    @Get(':id')
    findOne(@Param('id',ParseIntPipe) id: number){
        return this.catsService.findOne(id);
    }

    @Patch(':id')
    @Roles(UserRole.ADMIN)
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateCatDto: UpdateCatDto,
    ){
        return this.catsService.update(id, updateCatDto);
    }

    @Delete(':id')
    @Roles(UserRole.ADMIN)
    @HttpCode(HttpStatus.NO_CONTENT)
    remove(@Param('id', ParseIntPipe) id: number){
        return this.catsService.remove(id);
    }

    @Post(':id/restore')
    @Roles(UserRole.ADMIN)
    restore(@Param('id', ParseIntPipe) id: number){
        return this.catsService.restore(id);
    }

    @Delete(':id/hard')
    @Roles(UserRole.ADMIN)
    @HttpCode(HttpStatus.NO_CONTENT)
    hardDelete(@Param('id', ParseIntPipe) id: number) {

        return this.catsService.hardDelete(id);
    }

}
import {Body, Controller, Delete, Get, Param, ParseBoolPipe, ParseIntPipe, Patch, Post, Query} from '@nestjs/common';
import {PromotionService} from './promotion.service';
import {CreatePromotionDto} from './dto/create-promotion.dto';
import {UpdatePromotionDto} from './dto/update-promotion.dto';
import {Public} from "../auth/decorators/public.decorator";
import {Roles} from "../auth/decorators/roles.decorator";
import {UserRole} from "../users/enum/user-role.enum";
import {PromotionResponseDto} from "./dto/promotion-response.dto";

@Controller('promotions')
export class PromotionController {
    constructor(private readonly promotionService: PromotionService) {
    }

    @Post()
    @Roles(UserRole.ADMIN)
    create(@Body() createPromotionDto: CreatePromotionDto) {
        return this.promotionService.create(createPromotionDto);
    }

    @Get()
    @Public()
    findAll(@Query('isActive', new ParseBoolPipe({optional: true})) isActive?: boolean): Promise<PromotionResponseDto[]> {
        return this.promotionService.findAll(isActive);
    }

    @Get('category/:categoryId')
    @Public()
    findByCategory(@Param('categoryId', ParseIntPipe) categoryId: number): Promise<PromotionResponseDto[]> {
        return this.promotionService.findByCategory(categoryId);
    }


    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.promotionService.findOne(+id);
    }

    @Patch(':id')
    @Roles(UserRole.ADMIN)
    update(@Param('id', ParseIntPipe) id: number, @Body() updatePromotionDto: UpdatePromotionDto) {
        return this.promotionService.update(+id, updatePromotionDto);
    }

    @Patch(':id/toggle-active')
    @Roles(UserRole.ADMIN)
    toggleActive(@Param('id', ParseIntPipe) id: number) {
        return this.promotionService.toggleActive(id);
    }


    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.promotionService.remove(+id);
    }

    @Post(':id/restore')
    @Roles(UserRole.ADMIN)
    restore(@Param('id', ParseIntPipe) id: number) {
        return this.promotionService.restore(id);
    }

    @Delete(':id/hard')
    @Roles(UserRole.ADMIN)
    hardDelete(@Param('id', ParseIntPipe) id: number){
        return this.promotionService.hardDelete(id);
    }
}

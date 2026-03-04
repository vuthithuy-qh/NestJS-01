import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { VariantService } from '../services/variant.service';
import { CreateVariantDto } from '../dto/create-variant.dto';
import {UpdateVariantDto} from "../dto/update-variant.dto";
import { CreateVariantOptionDto } from '../dto/create-variant-option.dto';
import {UpdateVariantOptionDto} from "../dto/update-variant-option.dto";
import { Roles } from '../../auth/decorators/roles.decorator';
import { Public } from '../../auth/decorators/public.decorator';
import { UserRole } from '../../users/enum/user-role.enum';

@ApiTags('variants')
@Controller('variants')
export class VariantController {
    constructor(private readonly variantService: VariantService) {}

    // VARIANT ENDPOINTS

@Post()
@Roles(UserRole.ADMIN)
createVariant(@Body() createDto: CreateVariantDto) {
    return this.variantService.createVariant(createDto);
}

@Get()
@Public()
findAllVariants(@Query('categoryId') categoryId?: number) {
    return this.variantService.findAllVariants(categoryId ? +categoryId : undefined);
}

@Get(':id')
@Public()
findVariantById(@Param('id') id: string) {
    return this.variantService.findVariantById(+id);
}

@Patch(':id')
@Roles(UserRole.ADMIN)
updateVariant(@Param('id') id: string, @Body() updateDto: UpdateVariantDto) {
    return this.variantService.updateVariant(+id, updateDto);
}

@Delete(':id')
@Roles(UserRole.ADMIN)
@HttpCode(HttpStatus.OK)
removeVariant(@Param('id') id: string) {
    return this.variantService.removeVariant(+id);
}

//  VARIANT OPTION ENDPOINTS

@Post('options')
@Roles(UserRole.ADMIN)
createVariantOption(@Body() createDto: CreateVariantOptionDto) {
    return this.variantService.createVariantOption(createDto);
}

@Get('options/all')
@Public()
findAllVariantOptions(@Query('variantId') variantId?: number) {
    return this.variantService.findAllVariantOptions(variantId ? +variantId : undefined);
}

@Get('options/:id')
@Public()
findVariantOptionById(@Param('id') id: string) {
    return this.variantService.findVariantOptionById(+id);
}

@Patch('options/:id')
@Roles(UserRole.ADMIN)
updateVariantOption(@Param('id') id: string, @Body() updateDto: UpdateVariantOptionDto) {
    return this.variantService.updateVariantOption(+id, updateDto);
}

@Delete('options/:id')
@Roles(UserRole.ADMIN)
@HttpCode(HttpStatus.OK)
removeVariantOption(@Param('id') id: string) {
    return this.variantService.removeVariantOption(+id);
}
}
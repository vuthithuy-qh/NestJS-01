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
import {ApiTags, ApiOperation, ApiResponse, ApiBearerAuth} from '@nestjs/swagger';
import {CatSpecService} from '../services/cat-spec.service';
import {CreateCatSpecDto} from '../dto/create-cat-spec.dto';
import {UpdateCatSpecDto} from '../dto/update-cat-spec.dto';
import {UpdateStockDto} from '../dto/update-stock.dto';
import {Roles} from '../../auth/decorators/roles.decorator';
import {Public} from '../../auth/decorators/public.decorator';
import {UserRole} from '../../users/enum/user-role.enum';

@ApiTags('cat-specs')
@Controller('cat-specs')
export class CatSpecController {
    constructor(private readonly catSpecService: CatSpecService) {
    }

    @Post()
    @Roles(UserRole.ADMIN)
    create(@Body() createDto: CreateCatSpecDto) {
        return this.catSpecService.create(createDto);
    }

    @Get()
    @Public()
    findAll(@Query('catId') catId?: number) {
        return this.catSpecService.findAll(catId ? +catId : undefined);
    }

    @Get(':id')
    @Public()
    findOne(@Param('id') id: string) {
        return this.catSpecService.findOne(+id);
    }

    @Get('sku/:sku')
    @Public()
    findBySku(@Param('sku') sku: string) {
        return this.catSpecService.findBySku(sku);
    }

    @Patch(':id')
    @Roles(UserRole.ADMIN)
    update(@Param('id') id: string, @Body() updateDto: UpdateCatSpecDto) {
        return this.catSpecService.update(+id, updateDto);
    }

    @Patch(':id/stock')
    @Roles(UserRole.ADMIN)
    updateStock(@Param('id') id: string, @Body() body: UpdateStockDto) {
        return this.catSpecService.updateStock(+id, body.quantity);
    }

    @Delete(':id')
    @Roles(UserRole.ADMIN)
    @HttpCode(HttpStatus.OK)
    remove(@Param('id') id: string) {
        return this.catSpecService.remove(+id);
    }
}
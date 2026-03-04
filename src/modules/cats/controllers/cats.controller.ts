import { CatsService } from '../services/cats.service';
import { CatRankingService } from '../services/cat-ranking.service';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateCatDto } from '../dto/create-cat.dto';
import { HttpCode, HttpStatus } from '@nestjs/common';
import { FilterCatDto } from '../dto/filter-cat.dto';
import { UpdateCatDto } from '../dto/update-cat.dto';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../users/enum/user-role.enum';
import { Public } from 'src/modules/auth/decorators/public.decorator';
import { CurrentUser } from '../../auth/decorators/current-user-decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { InteractionType } from '../enum/interaction-type.enum';

@ApiTags('cats')
@Controller('cats')
export class CatsController {
  constructor(
    private readonly catsService: CatsService,
    private readonly catRankingService: CatRankingService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createCatDto: CreateCatDto) {
    return this.catsService.create(createCatDto);
  }

  @Get()
  @Public()
  findAll(@Query() filterDto: FilterCatDto) {
    return this.catsService.findAll(filterDto);
  }

  /**
   * GET /cats/ranked?limit=12
   * Returns cats sorted by PageRank-style popularity score.
   * Uses damping factor d=0.85 (85% popularity, 15% random chance).
   */
  @Get('ranked')
  @Public()
  async getRankedCats(@Query('limit') limit?: number) {
    const rankedIds = await this.catRankingService.getRankedCatIds(
      limit ? +limit : 20,
    );
    if (rankedIds.length === 0) {
      // Fallback: return latest cats
      return this.catsService.findAll({ page: 1, limit: limit ? +limit : 20 });
    }
    return this.catsService.findByIds(rankedIds);
  }

  /**
   * GET /cats/ranking-stats
   * Admin-only: view ranking debug info
   */
  @Get('ranking-stats')
  @Roles(UserRole.ADMIN)
  getRankingStats() {
    return this.catRankingService.getRankingStats();
  }

  /**
   * POST /cats/:id/track
   * Track a user interaction (view, cart_add, purchase)
   */
  @Post(':id/track')
  @Public()
  async trackInteraction(
    @Param('id', ParseIntPipe) catId: number,
    @Body('type') type: InteractionType,
    @CurrentUser('id') userId?: number,
  ) {
    const validType = Object.values(InteractionType).includes(type)
      ? type
      : InteractionType.VIEW;
    await this.catRankingService.trackInteraction(catId, validType, userId);
    return { tracked: true };
  }

  /**
   * GET /cats/:id/related?limit=8
   * Returns related cats (same category first, then fill with others).
   */
  @Get(':id/related')
  @Public()
  getRelatedCats(
    @Param('id', ParseIntPipe) id: number,
    @Query('limit') limit?: number,
  ) {
    return this.catsService.findRelated(id, limit ? +limit : 8);
  }

  @Get(':id')
  @Public()
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.catsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCatDto: UpdateCatDto,
  ) {
    return this.catsService.update(id, updateCatDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.catsService.remove(id);
  }

  @Post(':id/restore')
  @Roles(UserRole.ADMIN)
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.catsService.restore(id);
  }

  @Delete(':id/hard')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  hardDelete(@Param('id', ParseIntPipe) id: number) {
    return this.catsService.hardDelete(id);
  }

  @Post(':id/upload-image')
  @Roles(UserRole.ADMIN)
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: 5 * 1024 * 1024 }, // Giới hạn 5MB
    }),
  )
  uploadImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.catsService.uploadImage(id, file);
  }
}

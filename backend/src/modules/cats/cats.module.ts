import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cat } from './entities/cat.entity';
import { CatSpec } from './entities/cat-spec.entity';
import { CatConfiguration } from './entities/cat-configuration.entity';
import { Variant } from './entities/variant.entity';
import { VariantOption } from './entities/variant-option.entity';
import { CatInteraction } from './entities/cat-interaction.entity';
import { CatsController } from './controllers/cats.controller';
import { CatSpecController } from './controllers/cat-spec.controller';
import { VariantController } from './controllers/variant.controller';
import { CatsService } from './services/cats.service';
import { CatSpecService } from './services/cat-spec.service';
import { VariantService } from './services/variant.service';
import { CatRankingService } from './services/cat-ranking.service';
import { CloudinaryModule } from 'src/providers/cloudinary/cloudinary.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Cat,
      CatSpec,
      CatConfiguration,
      Variant,
      VariantOption,
      CatInteraction,
    ]),
    CloudinaryModule,
    NotificationsModule,
  ],
  controllers: [CatsController, CatSpecController, VariantController],
  providers: [CatsService, CatSpecService, VariantService, CatRankingService],
  exports: [CatsService, CatSpecService, VariantService, CatRankingService],
})
export class CatsModule {}

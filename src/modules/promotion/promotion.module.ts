import {Module} from '@nestjs/common';
import {PromotionService} from './promotion.service';
import {PromotionController} from './promotion.controller';
import {PromotionCategory} from "./entities/PromotionCategory.enitty";
import {TypeOrmModule} from "@nestjs/typeorm";
import {Promotion} from "./entities/promotion.entity";
import {Category} from "../category/entities/category.entity";

@Module({
    imports: [
        TypeOrmModule.forFeature([
            PromotionCategory, Promotion, Category
        ]),
    ],
    controllers: [PromotionController],
    providers: [PromotionService],
    exports: [PromotionService]
})
export class PromotionModule {
}

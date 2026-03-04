import { Module } from '@nestjs/common';
import { ShoppingCartService } from './shopping-cart.service';
import { ShoppingCartController } from './shopping-cart.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShoppingCartItem } from './entities/shopping-cart-item.entity';
import { CatSpec } from '../cats/entities/cat-spec.entity';
import { ShoppingCart } from './entities/shopping-cart.entity';
import { PromotionModule } from '../promotion/promotion.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ShoppingCart, ShoppingCartItem, CatSpec]),
    PromotionModule,
  ],
  controllers: [ShoppingCartController],
  providers: [ShoppingCartService],
  exports: [ShoppingCartService],
})
export class ShoppingCartModule {}

import { Module, forwardRef } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShopOrder } from './entities/shop-order.entity';
import { OrderLine } from './entities/order-line.entity';
import { OrderStatus } from './entities/order-status.entity';
import { ShoppingCartModule } from '../shopping-cart/shopping-cart.module';
import { PaymentModule } from '../payment/payment.module';
import { ShippingMethod } from './entities/shipping-method.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ShopOrder,
      OrderLine,
      OrderStatus,
      ShippingMethod,
    ]),
    ShoppingCartModule,
    forwardRef(() => PaymentModule),
  ],
  providers: [OrdersService],
  controllers: [OrdersController],
  exports: [OrdersService],
})
export class OrdersModule {}

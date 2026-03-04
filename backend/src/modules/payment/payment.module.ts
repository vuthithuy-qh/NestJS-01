import { Module, forwardRef } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { TypeOrmModule } from '@nestjs/typeorm/dist/typeorm.module';
import { UserPaymentMethod } from './entities/user-payment-method.entity';
import { PaymentTransaction } from './entities/payment-transaction.entity';
import { PaymentType } from './entities/payment-type.entity';
import { VnpayService } from './vnpay.service';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserPaymentMethod,
      PaymentTransaction,
      PaymentType,
    ]),
    forwardRef(() => OrdersModule),
  ],
  exports: [TypeOrmModule, PaymentService],
  providers: [PaymentService, VnpayService],
  controllers: [PaymentController],
})
export class PaymentModule {}

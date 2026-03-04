import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentTransaction } from './entities/payment-transaction.entity';
import { PaymentType, PaymentTypeEnum } from './entities/payment-type.entity';
import { UserPaymentMethod } from './entities/user-payment-method.entity';
import { PaymentProviderEnum } from './enum/payment-provider.enum';
import { PaymentStatus } from './enum/payment-status.enum';
import { VnpayService, VnpayReturnParams } from './vnpay.service';
import { OrdersService } from '../orders/orders.service';
import { OrderStatusEnum } from '../orders/entities/order-status.entity';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(PaymentTransaction)
    private readonly txnRepo: Repository<PaymentTransaction>,

    @InjectRepository(PaymentType)
    private readonly paymentTypeRepo: Repository<PaymentType>,

    @InjectRepository(UserPaymentMethod)
    private readonly userPaymentMethodRepo: Repository<UserPaymentMethod>,

    private readonly vnpayService: VnpayService,
    private readonly ordersService: OrdersService,
  ) {}

  /**
   * Create VNPay payment URL for an order
   */
  async createVnpayPaymentUrl(
    userId: number,
    orderId: number,
    ipAddr: string,
    locale?: string,
  ): Promise<{ paymentUrl: string }> {
    // Validate order ownership
    const isOwner = await this.ordersService.validateOrderOwnership(
      orderId,
      userId,
    );
    if (!isOwner) {
      throw new NotFoundException(`Order #${orderId} not found`);
    }

    const order = await this.ordersService.findById(orderId);
    if (order.status.status !== OrderStatusEnum.PENDING) {
      throw new BadRequestException(
        'Đơn hàng không ở trạng thái chờ thanh toán',
      );
    }

    // Ensure user has a VNPay payment method linked (or create one)
    let userPaymentMethod = await this.getOrCreateUserPaymentMethod(
      userId,
      PaymentProviderEnum.VNPAY,
    );

    // Attach payment method to order
    await this.ordersService.attachPaymentMethodToOrder(
      orderId,
      userPaymentMethod,
    );

    // Create pending transaction
    const txn = this.txnRepo.create({
      orderId,
      userId,
      paymentMethodId: userPaymentMethod.id,
      status: PaymentStatus.PENDING,
      amount: order.orderTotal,
    });
    await this.txnRepo.save(txn);

    // Generate VNPay URL
    const paymentUrl = this.vnpayService.createPaymentUrl({
      orderId,
      amount: Number(order.orderTotal),
      orderInfo: `Thanh toan don hang #${orderId} - Pet Shop Vu`,
      ipAddr,
      locale,
    });

    return { paymentUrl };
  }

  /**
   * Handle VNPay return (redirect back from VNPay)
   */
  async handleVnpayReturn(query: VnpayReturnParams) {
    // 1. Verify hash
    const isValid = this.vnpayService.verifyReturnUrl(query);

    const orderId = parseInt(query.vnp_TxnRef);
    const responseCode = query.vnp_ResponseCode;
    const transactionNo = query.vnp_TransactionNo;
    const message = this.vnpayService.getResponseMessage(responseCode);

    if (!isValid) {
      return {
        success: false,
        orderId,
        message: 'Chữ ký không hợp lệ',
        code: '97',
      };
    }

    // 2. Find pending transaction for this order
    const txn = await this.txnRepo.findOne({
      where: { orderId, status: PaymentStatus.PENDING },
      order: { createdAt: 'DESC' },
    });

    if (!txn) {
      return {
        success: false,
        orderId,
        message: 'Không tìm thấy giao dịch',
        code: '01',
      };
    }

    // 3. Check if already processed
    if (txn.status !== PaymentStatus.PENDING) {
      return {
        success: txn.status === PaymentStatus.SUCCESS,
        orderId,
        message: 'Giao dịch đã được xử lý trước đó',
        code: '02',
      };
    }

    // 4. Verify amount matches
    const vnpAmount = parseInt(query.vnp_Amount) / 100;
    if (Math.round(vnpAmount) !== Math.round(Number(txn.amount))) {
      txn.status = PaymentStatus.FAILED;
      txn.providerTransactionId = transactionNo;
      txn.providerResponse = JSON.stringify(query);
      await this.txnRepo.save(txn);

      return {
        success: false,
        orderId,
        message: 'Số tiền không khớp',
        code: '04',
      };
    }

    // 5. Update transaction based on response
    const isSuccess = this.vnpayService.isPaymentSuccess(query);

    txn.providerTransactionId = transactionNo;
    txn.providerResponse = JSON.stringify(query);

    if (isSuccess) {
      txn.status = PaymentStatus.SUCCESS;
      await this.txnRepo.save(txn);

      // Update order status to confirmed
      try {
        await this.ordersService.updateOrderStatus(
          orderId,
          OrderStatusEnum.CONFIRMED,
        );
      } catch {
        // Order might already be confirmed — don't fail the payment response
      }

      return {
        success: true,
        orderId,
        message,
        code: responseCode,
        transactionNo,
      };
    } else {
      txn.status =
        responseCode === '24' ? PaymentStatus.CANCELLED : PaymentStatus.FAILED;
      await this.txnRepo.save(txn);

      return {
        success: false,
        orderId,
        message,
        code: responseCode,
        transactionNo,
      };
    }
  }

  /**
   * Handle VNPay IPN (server-to-server callback)
   */
  async handleVnpayIpn(query: VnpayReturnParams) {
    const isValid = this.vnpayService.verifyReturnUrl(query);

    if (!isValid) {
      return { RspCode: '97', Message: 'Invalid Checksum' };
    }

    const orderId = parseInt(query.vnp_TxnRef);
    const txn = await this.txnRepo.findOne({
      where: { orderId },
      order: { createdAt: 'DESC' },
    });

    if (!txn) {
      return { RspCode: '01', Message: 'Order Not Found' };
    }

    // Already processed
    if (txn.status === PaymentStatus.SUCCESS) {
      return { RspCode: '02', Message: 'Order Already Confirmed' };
    }

    // Verify amount
    const vnpAmount = parseInt(query.vnp_Amount) / 100;
    if (Math.round(vnpAmount) !== Math.round(Number(txn.amount))) {
      return { RspCode: '04', Message: 'Invalid Amount' };
    }

    const isSuccess = this.vnpayService.isPaymentSuccess(query);
    txn.providerTransactionId = query.vnp_TransactionNo;
    txn.providerResponse = JSON.stringify(query);

    if (isSuccess) {
      txn.status = PaymentStatus.SUCCESS;
      await this.txnRepo.save(txn);

      try {
        await this.ordersService.updateOrderStatus(
          orderId,
          OrderStatusEnum.CONFIRMED,
        );
      } catch {
        // ignore
      }

      return { RspCode: '00', Message: 'Confirm Success' };
    } else {
      txn.status = PaymentStatus.FAILED;
      await this.txnRepo.save(txn);
      return { RspCode: '00', Message: 'Confirm Success' };
    }
  }

  /**
   * Get payment status for an order
   */
  async getPaymentStatus(orderId: number) {
    const txn = await this.txnRepo.findOne({
      where: { orderId },
      order: { createdAt: 'DESC' },
    });

    if (!txn) {
      return { status: 'none', message: 'Chưa có giao dịch thanh toán' };
    }

    return {
      status: txn.status,
      transactionNo: txn.providerTransactionId,
      amount: txn.amount,
      createdAt: txn.createdAt,
    };
  }

  // ===== HELPERS =====

  private async getOrCreateUserPaymentMethod(
    userId: number,
    provider: PaymentProviderEnum,
  ): Promise<UserPaymentMethod> {
    // Find existing
    let upm = await this.userPaymentMethodRepo.findOne({
      where: { user: { id: userId }, provider },
    });

    if (upm) return upm;

    // Ensure payment type exists
    let paymentType = await this.paymentTypeRepo.findOne({
      where: { value: PaymentTypeEnum.E_WALLET },
    });

    if (!paymentType) {
      paymentType = this.paymentTypeRepo.create({
        value: PaymentTypeEnum.E_WALLET,
        displayName: 'Ví điện tử',
      });
      await this.paymentTypeRepo.save(paymentType);
    }

    upm = this.userPaymentMethodRepo.create({
      user: { id: userId } as any,
      paymentType,
      provider,
      isDefault: false,
    });

    return this.userPaymentMethodRepo.save(upm);
  }
}

import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreatePaymentUrlDto } from './dto/create-payment-url.dto';
import { CurrentUser } from '../auth/decorators/current-user-decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Request } from 'express';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /**
   * POST /payment/create-vnpay-url
   * Creates a VNPay payment URL for an order
   */
  @Post('create-vnpay-url')
  @HttpCode(HttpStatus.OK)
  async createVnpayUrl(
    @CurrentUser('id') userId: number,
    @Body() dto: CreatePaymentUrlDto,
    @Req() req: any,
  ) {
    const ipAddr =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      '127.0.0.1';

    return this.paymentService.createVnpayPaymentUrl(
      userId,
      dto.orderId,
      ipAddr,
      dto.locale,
    );
  }

  /**
   * GET /payment/vnpay-return
   * VNPay redirects user back here after payment
   * This is a PUBLIC endpoint (no auth needed, user just got redirected)
   */
  @Get('vnpay-return')
  @Public()
  async vnpayReturn(@Query() query: any) {
    return this.paymentService.handleVnpayReturn(query);
  }

  /**
   * GET /payment/vnpay-ipn
   * VNPay server-to-server IPN callback
   * MUST be @Public() — VNPay calls this directly
   */
  @Get('vnpay-ipn')
  @Public()
  async vnpayIpn(@Query() query: any) {
    return this.paymentService.handleVnpayIpn(query);
  }

  /**
   * GET /payment/status?orderId=123
   * Check payment status for an order
   */
  @Get('status')
  async getPaymentStatus(@Query('orderId') orderId: number) {
    return this.paymentService.getPaymentStatus(orderId);
  }
}

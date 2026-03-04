import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface VnpayPaymentUrlParams {
  orderId: number;
  amount: number; // VND (not multiplied yet)
  orderInfo: string;
  ipAddr: string;
  locale?: string; // 'vn' | 'en', default: 'vn'
}

export interface VnpayReturnParams {
  vnp_TmnCode: string;
  vnp_Amount: string;
  vnp_BankCode: string;
  vnp_BankTranNo?: string;
  vnp_CardType?: string;
  vnp_PayDate?: string;
  vnp_OrderInfo: string;
  vnp_TransactionNo: string;
  vnp_ResponseCode: string;
  vnp_TransactionStatus: string;
  vnp_TxnRef: string;
  vnp_SecureHash: string;
  vnp_SecureHashType?: string;
  [key: string]: string | undefined;
}

@Injectable()
export class VnpayService {
  private readonly tmnCode: string;
  private readonly hashSecret: string;
  private readonly vnpUrl: string;
  private readonly returnUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.tmnCode = this.configService.get<string>('VNPAY_TMN_CODE') || '';
    this.hashSecret = this.configService.get<string>('VNPAY_HASH_SECRET') || '';
    this.vnpUrl =
      this.configService.get<string>('VNPAY_URL') ||
      'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
    this.returnUrl =
      this.configService.get<string>('VNPAY_RETURN_URL') ||
      'http://localhost:5500/modules/checkout/html/payment-result.html';
  }

  /**
   * Create VNPay payment URL
   */
  createPaymentUrl(params: VnpayPaymentUrlParams): string {
    const date = new Date();
    const createDate = this.formatDate(date);
    const expireDate = this.formatDate(
      new Date(date.getTime() + 15 * 60 * 1000),
    ); // 15 min

    const vnpParams: Record<string, string> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: this.tmnCode,
      vnp_Locale: params.locale || 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: String(params.orderId),
      vnp_OrderInfo: params.orderInfo,
      vnp_OrderType: 'other',
      vnp_Amount: String(Math.round(params.amount) * 100), // VNPay requires amount * 100
      vnp_ReturnUrl: this.returnUrl,
      vnp_IpAddr: params.ipAddr,
      vnp_CreateDate: createDate,
      vnp_ExpireDate: expireDate,
    };

    // Sort params alphabetically
    const sortedParams = this.sortObject(vnpParams);

    // Build query string (without hash)
    const signData = new URLSearchParams(sortedParams).toString();

    // Create HMAC-SHA512
    const hmac = crypto.createHmac('sha512', this.hashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    // Append hash to URL
    return `${this.vnpUrl}?${signData}&vnp_SecureHash=${signed}`;
  }

  /**
   * Verify VNPay return/IPN data
   * Returns true if the hash is valid
   */
  verifyReturnUrl(query: VnpayReturnParams): boolean {
    const secureHash = query.vnp_SecureHash;
    if (!secureHash) return false;

    // Remove hash fields from params
    const params: Record<string, string> = {};
    for (const [key, value] of Object.entries(query)) {
      if (
        key !== 'vnp_SecureHash' &&
        key !== 'vnp_SecureHashType' &&
        value !== undefined
      ) {
        params[key] = value;
      }
    }

    const sortedParams = this.sortObject(params);
    const signData = new URLSearchParams(sortedParams).toString();

    const hmac = crypto.createHmac('sha512', this.hashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    return secureHash === signed;
  }

  /**
   * Check if payment was successful based on response code
   */
  isPaymentSuccess(query: VnpayReturnParams): boolean {
    return (
      query.vnp_ResponseCode === '00' && query.vnp_TransactionStatus === '00'
    );
  }

  /**
   * Get human-readable message for VNPay response code
   */
  getResponseMessage(responseCode: string): string {
    const messages: Record<string, string> = {
      '00': 'Giao dịch thành công',
      '07': 'Trừ tiền thành công. Giao dịch bị nghi ngờ (liên hệ ngân hàng)',
      '09': 'Thẻ/Tài khoản chưa đăng ký Internet Banking tại ngân hàng',
      '10': 'Xác thực sai quá 3 lần',
      '11': 'Hết thời gian thanh toán. Vui lòng thử lại.',
      '12': 'Thẻ/Tài khoản bị khóa',
      '13': 'Bạn nhập sai mật khẩu xác thực (OTP)',
      '24': 'Khách hàng hủy giao dịch',
      '51': 'Tài khoản không đủ số dư',
      '65': 'Tài khoản đã vượt quá hạn mức giao dịch trong ngày',
      '75': 'Ngân hàng thanh toán đang bảo trì',
      '79': 'Nhập sai mật khẩu thanh toán quá số lần quy định',
      '99': 'Lỗi không xác định',
    };
    return messages[responseCode] || `Mã lỗi: ${responseCode}`;
  }

  // ===== HELPERS =====

  private sortObject(obj: Record<string, string>): Record<string, string> {
    const sorted: Record<string, string> = {};
    const keys = Object.keys(obj).sort();
    for (const key of keys) {
      sorted[key] = obj[key];
    }
    return sorted;
  }

  private formatDate(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return (
      date.getFullYear().toString() +
      pad(date.getMonth() + 1) +
      pad(date.getDate()) +
      pad(date.getHours()) +
      pad(date.getMinutes()) +
      pad(date.getSeconds())
    );
  }
}

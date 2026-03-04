import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreatePaymentUrlDto {
  @IsNumber()
  @IsNotEmpty()
  orderId: number;

  @IsString()
  @IsOptional()
  locale?: string; // 'vn' | 'en'
}

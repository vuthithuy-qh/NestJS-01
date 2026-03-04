import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateOrderDto {
  @IsNumber()
  @IsOptional()
  shippingMethodId?: number;

  @IsNotEmpty()
  addressId: number;

  @IsNumber()
  @IsOptional()
  shippingFee?: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  itemIds?: number[];

  /** Payment method: 'cod' | 'vnpay' */
  @IsString()
  @IsOptional()
  paymentMethod?: string;
}

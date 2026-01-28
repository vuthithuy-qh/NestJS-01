import {
    IsString,
    IsNotEmpty,
    IsEnum,
    IsNumber,
    IsDateString,
    IsBoolean,
    IsOptional,
    IsArray,
    Min,
    Max,
    ValidateIf
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DiscountType } from '../enum/discount-type.enum';

export class CreatePromotionDto {
    @ApiProperty({
        example: 'Summer Sale 2025',
        description: 'Promotion name',
    })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiPropertyOptional({
        example: 'Giảm giá mùa hè cho tất cả mèo Ba Tư',
        description: 'Promotion description',
    })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({
        enum: DiscountType,
        example: DiscountType.PERCENTAGE,
        description: 'Discount type: percentage or fixed',
    })
    @IsEnum(DiscountType)
    @IsNotEmpty()
    discountType: DiscountType;

    @ApiPropertyOptional({
        example: 20,
        description: 'Discount rate (0-100) for percentage type',
        minimum: 0,
        maximum: 100,
    })
    @ValidateIf(o => o.discountType === DiscountType.PERCENTAGE)
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @Max(100)
    discountRate?: number;

    @ApiPropertyOptional({
        example: 500000,
        description: 'Fixed discount amount',
        minimum: 0,
    })
    @ValidateIf(o => o.discountType === DiscountType.FIXED)
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    discountAmount?: number;

    @ApiProperty({
        example: '2025-06-01T00:00:00Z',
        description: 'Promotion start date (ISO 8601)',
    })
    @IsDateString()
    @IsNotEmpty()
    startDate: string;

    @ApiProperty({
        example: '2025-08-31T23:59:59Z',
        description: 'Promotion end date (ISO 8601)',
    })
    @IsDateString()
    @IsNotEmpty()
    endDate: string;

    @ApiPropertyOptional({
        example: true,
        default: true,
        description: 'Is promotion active',
    })
    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    isActive?: boolean;

    @ApiProperty({
        example: [2, 3],
        description: 'Array of category IDs',
        type: [Number],
    })
    @IsArray()
    @Type(() => Number)
    @IsNumber({}, { each: true })
    categoryIds: number[];
}
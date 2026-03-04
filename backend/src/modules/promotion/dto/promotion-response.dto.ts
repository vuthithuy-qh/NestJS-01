import { ApiProperty } from '@nestjs/swagger';
import { DiscountType } from '../enum/discount-type.enum';

export class PromotionCategoryResponseDto {
    @ApiProperty()
    id: number;

    @ApiProperty()
    categoryId: number;

    @ApiProperty()
    categoryName: string;
}

export class PromotionResponseDto {
    @ApiProperty()
    id: number;

    @ApiProperty()
    name: string;

    @ApiProperty()
    description: string;

    @ApiProperty({ enum: DiscountType })
    discountType: DiscountType;

    @ApiProperty()
    discountRate: number;

    @ApiProperty()
    discountAmount: number;

    @ApiProperty()
    startDate: Date;

    @ApiProperty()
    endDate: Date;

    @ApiProperty()
    isActive: boolean;

    @ApiProperty({ type: [PromotionCategoryResponseDto] })
    categories: PromotionCategoryResponseDto[];

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;
}
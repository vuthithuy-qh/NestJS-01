import { ApiProperty } from '@nestjs/swagger';
import { CatStatus } from '../enum/cat-status.enum';
import { CatGender } from '../enum/cat-gender.enum';

export class VariantOptionResponseDto {
    @ApiProperty()
    id: number;

    @ApiProperty()
    variantId: number;

    @ApiProperty()
    variantName: string;

    @ApiProperty()
    value: string;
}

export class CatSpecResponseDto {
    @ApiProperty()
    id: number;

    @ApiProperty()
    sku: string;

    @ApiProperty()
    price: number;

    @ApiProperty()
    qtyInStock: number;

    @ApiProperty()
    catImage: string;

    @ApiProperty({ type: [VariantOptionResponseDto] })
    configurations: VariantOptionResponseDto[];
}

export class CatResponseDto {
    @ApiProperty()
    id: number;

    @ApiProperty()
    categoryId: number;

    @ApiProperty()
    categoryName: string;

    @ApiProperty()
    name: string;

    @ApiProperty()
    description: string;

    @ApiProperty()
    image: string;

    @ApiProperty({ enum: CatStatus })
    status: CatStatus;

    @ApiProperty({ enum: CatGender })
    gender: CatGender;

    @ApiProperty({ type: [CatSpecResponseDto] })
    specs: CatSpecResponseDto[];

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;
}
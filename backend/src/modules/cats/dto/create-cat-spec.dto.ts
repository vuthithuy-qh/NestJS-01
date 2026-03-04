import { IsString, IsNotEmpty, IsNumber, IsOptional, IsArray, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCatSpecDto {
    @ApiProperty({ example: 1, description: 'Cat ID' })
    @IsNumber()
    @IsNotEmpty()
    catId: number;

    @ApiProperty({ example: 'CAT-BP-2M-WHITE', description: 'Unique SKU' })
    @IsString()
    @IsNotEmpty()
    sku: string;

    @ApiProperty({ example: 5000000, description: 'Price in VND' })
    @IsNumber()
    @IsNotEmpty()
    @Min(0)
    price: number;

    @ApiProperty({ example: 10, description: 'Quantity in stock' })
    @IsNumber()
    @IsNotEmpty()
    @Min(0)
    qtyInStock: number;

    @ApiPropertyOptional({ example: 'https://example.com/cat-spec.jpg' })
    @IsOptional()
    @IsString()
    catImage?: string;

    @ApiProperty({
        example: [1, 5],
        description: 'Array of variant option IDs',
        type: [Number]
    })
    @IsArray()
    @IsNumber({}, { each: true })
    variantOptionIds: number[];
}
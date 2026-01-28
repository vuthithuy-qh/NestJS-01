import { IsString, IsNotEmpty, IsEnum, IsOptional, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CatStatus } from '../enum/cat-status.enum';
import { CatGender } from '../enum/cat-gender.enum';

export class CatSpecInCatDto {
    @ApiProperty({ example: 'CAT-BP-2M-WHITE' })
    @IsString()
    @IsNotEmpty()
    sku: string;

    @ApiProperty({ example: 5000000 })
    @IsNumber()
    @IsNotEmpty()
    price: number;

    @ApiProperty({ example: 10 })
    @IsNumber()
    @IsNotEmpty()
    qtyInStock: number;

    @ApiPropertyOptional({ example: 'https://example.com/cat.jpg' })
    @IsOptional()
    @IsString()
    catImage?: string;

    @ApiProperty({ example: [1, 3], description: 'Array of variant option IDs', type: [Number] })
    @IsArray()
    @IsNumber({}, { each: true })
    variantOptionIds: number[];
}

export class CreateCatDto {
    @ApiProperty({ example: 1, description: 'Category ID' })
    @IsNumber()
    @IsNotEmpty()
    categoryId: number;

    @ApiProperty({ example: 'Mèo Ba Tư Dễ Thương' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiPropertyOptional({ example: 'Mèo Ba Tư với bộ lông mềm mại' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ example: 'https://example.com/cat.jpg' })
    @IsOptional()
    @IsString()
    image?: string;

    @ApiProperty({ enum: CatStatus, default: CatStatus.AVAILABLE })
    @IsEnum(CatStatus)
    @IsOptional()
    status?: CatStatus;

    @ApiProperty({ enum: CatGender, example: CatGender.MALE })
    @IsEnum(CatGender)
    @IsNotEmpty()
    gender: CatGender;

    @ApiPropertyOptional({ type: [CatSpecInCatDto] })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CatSpecInCatDto)
    specs?: CatSpecInCatDto[];
}
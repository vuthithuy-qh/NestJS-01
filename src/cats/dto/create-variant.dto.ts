import { IsString, IsNotEmpty, IsNumber, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VariantOptionValueDto {
    @ApiProperty({ example: '2 months' })
    @IsString()
    @IsNotEmpty()
    value: string;
}

export class CreateVariantDto {
    @ApiProperty({ example: 1, description: 'Category ID' })
    @IsNumber()
    @IsNotEmpty()
    categoryId: number;

    @ApiProperty({ example: 'Age', description: 'Variant name (Age, Color, Size, etc.)' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiPropertyOptional({
        type: [VariantOptionValueDto],
        description: 'Variant options',
        example: [
            { "value": "2 months" },
            { "value": "6 months" }
        ]
    })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => VariantOptionValueDto)
    options?: VariantOptionValueDto[];
}
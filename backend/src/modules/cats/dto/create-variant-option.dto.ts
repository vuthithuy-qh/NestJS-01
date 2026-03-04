import { IsString, IsNotEmpty, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateVariantOptionDto {
    @ApiProperty({ example: 1, description: 'Variant ID' })
    @IsNumber()
    @IsNotEmpty()
    variantId: number;

    @ApiProperty({ example: '2 months' })
    @IsString()
    @IsNotEmpty()
    value: string;
}
import { PartialType } from '@nestjs/swagger';
import { CreateVariantDto } from './create-variant.dto';
import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateVariantDto {
    @ApiPropertyOptional({ example: 'Size' })
    @IsOptional()
    @IsString()
    name?: string;
}
import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateVariantOptionDto {
    @ApiPropertyOptional({ example: '3 months' })
    @IsOptional()
    @IsString()
    value?: string;
}
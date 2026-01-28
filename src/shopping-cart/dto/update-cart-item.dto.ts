import { IsNumber, IsNotEmpty, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCartItemDto {
    @ApiProperty({ example: 2, description: 'New quantity' })
    @IsNumber()
    @IsNotEmpty()
    @Min(1)
    qty: number;
}
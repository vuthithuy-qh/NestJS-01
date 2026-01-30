import { IsNumber, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateStockDto {
    @ApiProperty({
        example: -1,
        description: 'Quantity to add/subtract (positive to add, negative to subtract)'
    })
    @IsNumber()
    @IsNotEmpty()
    quantity: number;
}
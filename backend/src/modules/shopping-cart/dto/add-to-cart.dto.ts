import {ApiProperty} from "@nestjs/swagger";
import {IsNotEmpty, IsNumber, Min} from "class-validator";
import {Type} from "class-transformer";

export class AddToCartDto {

    @ApiProperty({example: 1, description: 'Cat specification ID'})
    @IsNumber()
    @IsNotEmpty()
    catSpecId: number;

    @ApiProperty({ example: 1, description: 'Quantity' })
    @IsNumber()
    @IsNotEmpty()
    @Min(1)
    qty: number;

}

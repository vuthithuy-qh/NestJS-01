import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {

    @IsString()
    @IsNotEmpty()
    oldPassword: string;


    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    newPassword: string;
}
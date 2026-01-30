import {IsEmail, IsEmpty, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength} from "class-validator";

export class RegisterDto {
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    password: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    fullName: string;

    @IsOptional()
    @IsString()
    @MaxLength(20)
    phone?: string;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    address?: string;
}
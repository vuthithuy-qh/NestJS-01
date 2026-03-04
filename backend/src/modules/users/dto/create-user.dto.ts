import {IsString, IsEmail, IsNotEmpty, MinLength, IsOptional, IsEnum, MaxLength, Length} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../enum/user-role.enum';

export class CreateUserDto {
    @IsEmail()
    @IsNotEmpty()
    email: string;


    @IsNotEmpty()
    @MinLength(6)
    password: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    fullName: string;

    @IsOptional()
    @IsString()
    @Length(10)
    phone?: string;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    address?: string;


    @IsOptional()
    @IsEnum(UserRole)
    role?: UserRole;
}
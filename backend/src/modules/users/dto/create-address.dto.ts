
import {
    IsBoolean,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';

export class CreateAddressDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    unit_number: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    street_number: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    address_line1: string;

    @IsString()
    @IsOptional()
    @MaxLength(255)
    address_line2?: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    city: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    region: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(20)
    postal_code: string;

    @IsInt()
    country_id: number;

    @IsBoolean()
    @IsOptional()
    is_default?: boolean;
}

import {IsEmail, IsEmpty, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength} from "class-validator";
import {Transform} from "class-transformer";
import {PhoneHelper} from "../../../utils/phone.helper";

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
    @Transform(({value}) => {
        try{
            return PhoneHelper.formatVietNamPhone(value);
        }catch {
            return value;
        }
    })
    @Matches(/^\+84[3|5|7|8|9][0-9]{8}$/, {
        message: 'Số điện thoại không hợp lệ. VD: 0912345678',
    })
    phone?: string;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    address?: string;
}
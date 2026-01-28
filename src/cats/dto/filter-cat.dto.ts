import {CatStatus} from "../enum/cat-status.enum";
import {ApiPropertyOptional} from "@nestjs/swagger";
import {IsEnum, IsNumber, IsOptional, IsString, Min} from "class-validator";
import {CatGender} from "../enum/cat-gender.enum";
import {Type} from "class-transformer";


export class FilterCatDto {

    @IsOptional()
    @IsEnum(CatStatus)
    status?: CatStatus;

    @IsOptional()
    @IsEnum(CatGender)
    gender?: CatGender;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    categoryId?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    minAge?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    maxAge?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    minPrice?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    maxPrice?: number;

    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    limit?: number = 10;

    @IsOptional()
    @IsString()
    sortBy?: string = 'createdAt';

    @IsOptional()
    @IsEnum(['ASC', 'DESC'])
    sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
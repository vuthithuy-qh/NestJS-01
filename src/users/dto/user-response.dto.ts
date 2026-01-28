import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../enum/user-role.enum';
import { Exclude } from 'class-transformer';

export class UserResponseDto {
    @ApiProperty()
    id: number;

    @ApiProperty()
    email: string;

    @Exclude()
    password: string;

    @ApiProperty()
    fullName: string;

    @ApiProperty()
    phone: string;

    @ApiProperty()
    address: string;

    @ApiProperty({ enum: UserRole })
    role: UserRole;

    @ApiProperty()
    isActive: boolean;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;
}
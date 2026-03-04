import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../enum/user-role.enum';
import { Exclude } from 'class-transformer';
import { Address } from '../entities/address.entity';
import { AddressResponseDto } from './address-respone.dto';

export class UserResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  email: string;

  @ApiProperty()
  fullName: string;

  @ApiProperty()
  phone: string;

  @ApiProperty({ type: () => AddressResponseDto, isArray: true })
  addresses: AddressResponseDto[];

  @ApiProperty({ enum: UserRole })
  role: UserRole;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

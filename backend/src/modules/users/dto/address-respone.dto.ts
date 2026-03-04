import { ApiProperty } from '@nestjs/swagger';

export class AddressResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  unit_number: string;

  @ApiProperty()
  street_number: string;

  @ApiProperty()
  address_line1: string;

  @ApiProperty({ nullable: true })
  address_line2: string;

  @ApiProperty()
  city: string;

  @ApiProperty()
  region: string;

  @ApiProperty()
  postal_code: string;

  @ApiProperty()
  country: string; // chỉ trả tên
}

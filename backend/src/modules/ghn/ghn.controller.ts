import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { GhnService } from './ghn.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('ghn')
@Public() // Address data is public — no auth needed
export class GhnController {
  constructor(private readonly ghnService: GhnService) {}

  /* =========== MASTER DATA =========== */

  @Get('provinces')
  getProvinces() {
    return this.ghnService.getProvinces();
  }

  @Get('districts')
  getDistricts(@Query('province_id', ParseIntPipe) provinceId: number) {
    return this.ghnService.getDistricts(provinceId);
  }

  @Get('wards')
  getWards(@Query('district_id', ParseIntPipe) districtId: number) {
    return this.ghnService.getWards(districtId);
  }

  /* =========== SHIPPING =========== */

  @Post('services')
  getAvailableServices(
    @Body('toDistrictId', ParseIntPipe) toDistrictId: number,
  ) {
    return this.ghnService.getAvailableServices(toDistrictId);
  }

  @Post('fee')
  calculateFee(
    @Body()
    body: {
      serviceTypeId: number;
      toDistrictId: number;
      toWardCode: string;
      weight?: number;
      insuranceValue?: number;
    },
  ) {
    return this.ghnService.calculateFee(body);
  }
}

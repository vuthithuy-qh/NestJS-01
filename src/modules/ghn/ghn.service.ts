import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GhnService {
  private readonly apiUrl: string;
  private readonly token: string;
  private readonly shopId: number;
  private readonly fromDistrictId: number;
  private readonly fromWardCode: string;
  private readonly defaultWeight: number;

  constructor(private readonly configService: ConfigService) {
    this.apiUrl =
      this.configService.get<string>('GHN_API_URL') ||
      'https://online-gateway.ghn.vn/shiip/public-api';
    this.token = this.configService.get<string>('GHN_TOKEN') || '';
    this.shopId = Number(this.configService.get('GHN_SHOP_ID')) || 0;
    this.fromDistrictId =
      Number(this.configService.get('GHN_FROM_DISTRICT_ID')) || 1442;
    this.fromWardCode =
      this.configService.get<string>('GHN_FROM_WARD_CODE') || '20308';
    this.defaultWeight =
      Number(this.configService.get('GHN_DEFAULT_WEIGHT')) || 3000;
  }

  /** Generic GHN API caller */
  private async callGhn(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    body?: Record<string, any>,
  ): Promise<any> {
    const headers: Record<string, string> = {
      Token: this.token,
      'Content-Type': 'application/json',
    };
    if (this.shopId) {
      headers['ShopId'] = String(this.shopId);
    }

    const options: RequestInit = { method, headers };
    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const res = await fetch(`${this.apiUrl}${endpoint}`, options);
      const data = await res.json();

      if (data.code !== 200) {
        throw new HttpException(
          data.message || 'GHN API error',
          HttpStatus.BAD_REQUEST,
        );
      }
      return data.data;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new HttpException(
        'Không thể kết nối GHN',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  // ======================== MASTER DATA ========================

  async getProvinces() {
    return this.callGhn('/master-data/province');
  }

  async getDistricts(provinceId: number) {
    return this.callGhn(`/master-data/district?province_id=${provinceId}`);
  }

  async getWards(districtId: number) {
    return this.callGhn(`/master-data/ward?district_id=${districtId}`);
  }

  // ======================== SHIPPING ========================

  async getAvailableServices(toDistrictId: number) {
    return this.callGhn('/v2/shipping-order/available-services', 'POST', {
      shop_id: this.shopId,
      from_district: this.fromDistrictId,
      to_district: toDistrictId,
    });
  }

  async calculateFee(dto: {
    serviceTypeId: number;
    toDistrictId: number;
    toWardCode: string;
    weight?: number;
    insuranceValue?: number;
  }) {
    return this.callGhn('/v2/shipping-order/fee', 'POST', {
      service_type_id: dto.serviceTypeId,
      from_district_id: this.fromDistrictId,
      from_ward_code: this.fromWardCode,
      to_district_id: dto.toDistrictId,
      to_ward_code: dto.toWardCode,
      weight: dto.weight || this.defaultWeight,
      insurance_value: dto.insuranceValue || 0,
    });
  }
}

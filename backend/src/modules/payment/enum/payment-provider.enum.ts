// src/modules/payment/enums/payment-provider.enum.ts
import {PaymentTypeEnum} from "../entities/payment-type.entity";

export enum PaymentProviderEnum {
    VNPAY = 'vnpay',
    MOMO = 'momo',
    ZALOPAY = 'zalopay',
    SHOPEEPAY = 'shopeepay',

    BANK_TRANSFER = 'bank_transfer',
    COD = 'cod',
}

// Mapping provider → type
export const PROVIDER_TYPE_MAP: Record<PaymentProviderEnum, PaymentTypeEnum> = {
    // E-Wallets
    [PaymentProviderEnum.VNPAY]: PaymentTypeEnum.E_WALLET,
    [PaymentProviderEnum.MOMO]: PaymentTypeEnum.E_WALLET,
    [PaymentProviderEnum.ZALOPAY]: PaymentTypeEnum.E_WALLET,
    [PaymentProviderEnum.SHOPEEPAY]: PaymentTypeEnum.E_WALLET,

    // Others
    [PaymentProviderEnum.BANK_TRANSFER]: PaymentTypeEnum.BANK_TRANSFER,
    [PaymentProviderEnum.COD]: PaymentTypeEnum.COD,
};
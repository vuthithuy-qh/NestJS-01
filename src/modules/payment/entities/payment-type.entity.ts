import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

export enum PaymentTypeEnum {
    E_WALLET = 'e_wallet',
    BANK_TRANSFER = 'bank_transfer',
    COD = 'cod',
}

@Entity('payment_type')
export class PaymentType {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({
        type: 'enum',
        enum: PaymentTypeEnum,
        unique: true,
    })
    value: PaymentTypeEnum;

    @Column({ type: 'varchar', length: 100 })
    displayName: string; // "Ví điện tử", "Thẻ tín dụng"
}
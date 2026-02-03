import {Column, PrimaryGeneratedColumn} from "typeorm";


export enum OrderStatusEnum {
    PENDING = 'pending',
    CONFIRMED = 'confirmed',
    PROCESSING = 'processing',
    SHIPPED = 'shipped',
    DELIVERED = 'delivered',
    CANCELLED = 'cancelled'
}

export class OrderStatus {
    @PrimaryGeneratedColumn('uuid')
    id: number;

    @Column ( {
        type: "enum",
        enum: OrderStatusEnum,
        unique: true
    })
    status: OrderStatusEnum;
}
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum OrderStatusEnum {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

@Entity('order_statuses')
export class OrderStatus {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: OrderStatusEnum,
    unique: true,
  })
  status: OrderStatusEnum;
}

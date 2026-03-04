import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { UserPaymentMethod } from '../../payment/entities/user-payment-method.entity';
import { OrderStatus } from './order-status.entity';
import { ShippingMethod } from './shipping-method.entity';
import { OrderLine } from './order-line.entity';
import { Address } from '../../users/entities/address.entity';

@Entity('shop_order')
export class ShopOrder {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  /* ORDER DATE */
  @Column({ type: 'timestamp' })
  orderDate: Date;

  /* PAYMENT METHOD (nullable vì có COD) */
  @ManyToOne(() => UserPaymentMethod, { nullable: true })
  @JoinColumn({ name: 'payment_method_id' })
  paymentMethod: UserPaymentMethod;

  /* SHIPPING ADDRESS */
  @ManyToOne(() => Address)
  @JoinColumn({ name: 'shipping_address_id' })
  address: Address;

  /* SHIPPING METHOD */
  @ManyToOne(() => ShippingMethod)
  @JoinColumn({ name: 'shipping_method_id' })
  shippingMethod: ShippingMethod;

  /* ORDER TOTAL */
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  orderTotal: number;

  /* SHIPPING FEE (from GHN or other provider) */
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    default: 0,
  })
  shippingFee: number;

  /* ORDER STATUS */
  @ManyToOne(() => OrderStatus)
  @JoinColumn({ name: 'order_status_id' })
  status: OrderStatus;

  /* ORDER LINES */
  @OneToMany(() => OrderLine, (line) => line.order, {
    cascade: true,
  })
  orderLines: OrderLine[];

  /* NOTES */
  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

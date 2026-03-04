import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { PaymentType } from './payment-type.entity';
import { PaymentProviderEnum } from '../enum/payment-provider.enum';

@Entity('user_payment_method')
export class UserPaymentMethod {
  @PrimaryGeneratedColumn()
  id: number;

  /* USER */
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  /* PAYMENT TYPE */
  @ManyToOne(() => PaymentType)
  @JoinColumn({ name: 'payment_type_id' })
  paymentType: PaymentType;

  /* PROVIDER */
  @Column({
    type: 'enum',
    enum: PaymentProviderEnum,
  })
  provider: PaymentProviderEnum;

  @Column({ type: 'varchar', length: 255, nullable: true })
  accountNumber: string;

  @Column({ type: 'date', nullable: true })
  expiryDate: Date;

  @Column({ type: 'boolean', default: false })
  isDefault: boolean;
}

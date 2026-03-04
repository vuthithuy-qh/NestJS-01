import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ShopOrder } from './shop-order.entity';
import { CatSpec } from '../../cats/entities/cat-spec.entity';

@Entity('order_line')
export class OrderLine {
  @PrimaryGeneratedColumn()
  id: number;

  /* ORDER */
  @ManyToOne(() => ShopOrder, (order) => order.orderLines, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'order_id' })
  order: ShopOrder;

  /* PRODUCT */
  @ManyToOne(() => CatSpec, { eager: true })
  @JoinColumn({ name: 'cat_spec_id' })
  catSpec: CatSpec;

  @Column({ type: 'int' })
  qty: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;
}

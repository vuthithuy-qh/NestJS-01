import {Column, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from "typeorm";
import {ShopOrder} from "./shop-order.entity";
import {CatSpec} from "../../cats/entities/cat-spec.entity";


export class OrderLine {
    @PrimaryGeneratedColumn('uuid')
    id: number;

    @Column({type: 'uuid'})
    orderId: string;

    @ManyToOne(() => ShopOrder, (order) => order.orderLines, {
        onDelete: 'CASCADE'
    })
    @JoinColumn({name: 'orderId'})
    order: ShopOrder;

    @Column({ type: 'uuid' })
    catSpecId: string;

    @ManyToOne(() => CatSpec, { eager: true })
    @JoinColumn({ name: 'catSpecId' })
    catSpec: CatSpec;

    @Column({ type: 'int' })
    qty: number;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    price: number;
}
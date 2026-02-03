import {
    Column,
    CreateDateColumn,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from "typeorm";
import {User} from "../../users/entities/user.entity";
import {UserPaymentMethod} from "../../payment/entities/user-payment-method.entity";
import {OrderStatus} from "./order-status.entity";
import {ShippingMethod} from "./shipping-method.entity";
import {OrderLine} from "./order-line.entity";
import {Address} from "../../users/entities/address.entity";


export class ShopOrder {
    @PrimaryGeneratedColumn('uuid')
    id: number;


    @Column({type: 'uuid'})
    userId: number;

    @ManyToOne(() => User)
    @JoinColumn({name: 'userId'})
    user: User

    @Column({type: 'timestamp'})
    orderDate: Date;

    @Column({type: 'uuid', nullable: true})
    paymentMethodId: number;

    @ManyToOne(() => UserPaymentMethod, {nullable: true})
    @JoinColumn({name: 'paymentMethodId'})
    paymentMethod: UserPaymentMethod;

    @Column({type: 'uuid'})
    shippingAddress: string;
    @ManyToOne(() => Address)
    @JoinColumn({name: 'shippingAddress'})
    address: Address;


    @Column({ type: 'uuid' })
    shippingMethod: string;

    @ManyToOne(() => ShippingMethod)
    @JoinColumn({ name: 'shippingMethod' })
    shipping: ShippingMethod;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    orderTotal: number;

    @Column({ type: 'uuid' })
    orderStatus: string;

    @ManyToOne(() => OrderStatus)
    @JoinColumn({ name: 'orderStatus' })
    status: OrderStatus;

    @OneToMany(() => OrderLine, (line) => line.order, {cascade: true})
    orderLines: OrderLine[];

    @Column({type: 'text', nullable: true})
    notes: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}

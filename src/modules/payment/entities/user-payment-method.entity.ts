import {Column, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from "typeorm";
import {User} from "../../users/entities/user.entity";
import {PaymentType} from "./payment-type.entity";
import {PaymentProviderEnum} from "../enum/payment-provider.enum";


export class UserPaymentMethod {
    @PrimaryGeneratedColumn('uuid')
    id: number;

    @Column({type: 'uuid'})
    userId: number;

    @ManyToOne(() => User, {onDelete : "CASCADE"} )
    @JoinColumn({name: 'userId'})
    user: User;

    @Column({type: 'uuid'})
    paymentTypeId: number;

    @ManyToOne(() => PaymentType)
    @JoinColumn({name: 'paymentTypeId'})
    paymentType: PaymentType;

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
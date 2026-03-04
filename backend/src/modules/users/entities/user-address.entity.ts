import {Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from "typeorm";
import {User} from "./user.entity";
import {Address} from "./address.entity";

@Entity('user_addresses')
export class UserAddress {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User, user => user.addresses)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @ManyToOne(() => Address, address => address.userAddresses)
    @JoinColumn({ name: 'address_id' })
    address: Address;

    @Column({ default: false })
    is_default: boolean;
}

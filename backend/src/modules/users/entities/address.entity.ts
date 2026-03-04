import {Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn} from "typeorm";
import {UserAddress} from "./user-address.entity";
import {Country} from "./country.entity";

@Entity('addresses')
export class Address {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    unit_number: string;

    @Column()
    street_number: string;

    @Column()
    address_line1: string;

    @Column({ nullable: true })
    address_line2: string;

    @Column()
    city: string;

    @Column()
    region: string;

    @Column()
    postal_code: string;

    @ManyToOne(() => Country)
    @JoinColumn({ name: 'country_id' })
    country: Country;

    @OneToMany(() => UserAddress, ua => ua.address)
    userAddresses: UserAddress[];
}

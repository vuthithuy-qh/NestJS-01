import {Column, PrimaryGeneratedColumn} from "typeorm";


export class ShippingMethod {
    @PrimaryGeneratedColumn('uuid')
    id: number;

    @Column({type: 'varchar', length: 100})
    name: string;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    price: number;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'int', nullable: true })
    estimatedDays: number;

    @Column({ type: 'boolean', default: true })
    isActive: boolean;
}
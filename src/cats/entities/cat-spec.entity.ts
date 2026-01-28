import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from "typeorm";
import {Cat} from "./cat.entity";
import {CatConfiguration} from "./cat-configuration.entity";


@Entity('cat_specs')
export class CatSpec {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    catId: number;

    @ManyToOne(() => Cat, cat => cat.specs)
    @JoinColumn({ name: 'catId' })
    cat: Cat;

    // SKU: Stock Keeping Unit
    @Column({ unique: true })
    sku: string; // "CAT-BP-2M-WHITE"

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    price: number;

    @Column({ default: 0 })
    qtyInStock: number;

    @Column({ nullable: true })
    catImage: string;

    @OneToMany(() => CatConfiguration, config => config.catSpec)
    configurations: CatConfiguration[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
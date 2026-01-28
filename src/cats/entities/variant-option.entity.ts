import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from "typeorm";
import {Variant} from "./variant.entity";

@Entity('variant_options')
export class VariantOption {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    variantId: number;

    @ManyToOne(() => Variant, variant => variant.options)
    @JoinColumn({ name: 'variantId' })
    variant: Variant;

    @Column()
    value: string; // "2 months", "White", "Small"

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
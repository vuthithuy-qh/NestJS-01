import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    ManyToOne,
    OneToMany,
    CreateDateColumn,
    UpdateDateColumn,
    JoinColumn,
} from 'typeorm';
import { Category } from '../../category/entities/category.entity';
import { VariantOption } from './variant-option.entity';

@Entity('variants')
export class Variant {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    categoryId: number;

    @ManyToOne(() => Category)
    @JoinColumn({ name: 'categoryId' })
    category: Category;

    @Column()
    name: string;

    @OneToMany(() => VariantOption, option => option.variant, { cascade: true })
    options: VariantOption[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
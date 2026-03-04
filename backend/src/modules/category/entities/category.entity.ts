import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    OneToMany,
    ManyToOne,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    JoinColumn,
} from 'typeorm';
import {PromotionCategory} from "../../promotion/entities/PromotionCategory.enitty";

@Entity('categories')
export class Category {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column({ nullable: true, type: 'text' })
    description: string;

    @Column({ nullable: true })
    parentCategoryId: number;

    @ManyToOne(() => Category, category => category.children, { nullable: true })
    @JoinColumn({ name: 'parentCategoryId' })
    parent: Category;

    @OneToMany(() => Category, category => category.parent)
    children: Category[];

    @OneToMany(() => PromotionCategory, pc => pc.category, {cascade: true})
    categoryPromotions: PromotionCategory[];


    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @DeleteDateColumn()
    deletedAt: Date;
}
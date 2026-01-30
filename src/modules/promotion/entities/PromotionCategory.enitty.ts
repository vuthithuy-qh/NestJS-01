import {Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from "typeorm";
import {Promotion} from "./promotion.entity";
import {Category} from "../../category/entities/category.entity";

@Entity('promotion_categories')
export class PromotionCategory {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    promotionId: number;

    @ManyToOne(() => Promotion, promotion => promotion.promotionCategories, {onDelete: 'CASCADE'})
    @JoinColumn({name: 'promotionId'})
    promotion: Promotion;

    @Column()
    categoryId: number;

    @ManyToOne(() => Category)
    @JoinColumn({name: 'categoryId'})
    category: Category;

    @CreateDateColumn()
    createdAt : Date;
}
import {
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from "typeorm";
import {DiscountType} from "../enum/discount-type.enum";
import {PromotionCategory} from "./PromotionCategory.enitty";

@Entity('promotions')
export class Promotion {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({
        type: 'enum',
        enum: DiscountType,
        default: DiscountType.PERCENTAGE,
    })
    discountType: DiscountType;

    @Column({type: 'decimal', precision: 5, scale: 2, nullable: true})
    discountRate: number;

    @Column({type: 'decimal', precision: 10, scale: 2, nullable: true})
    discountAmount: number; //fixed amount discount

    @Column({ type: 'datetime' })
    startDate: Date;

    @Column({ type: 'datetime' })
    endDate: Date;

    @Column({ default: true })
    isActive: boolean;

    @OneToMany(() => PromotionCategory, pc => pc.promotion, {cascade: true})
    promotionCategories: PromotionCategory[];


    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @DeleteDateColumn()
    deletedAt: Date;
}

import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    OneToMany,
    OneToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from "typeorm";
import {User} from "../../users/entities/user.entity";
import {ShoppingCartItem} from "./shopping-cart-item.entity";

@Entity('shopping_carts')
export class ShoppingCart {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({unique: true})
    userId: number;

    @OneToOne(() => User)
    @JoinColumn({name: 'userId'})
    user: User;

    @OneToMany(() => ShoppingCartItem, item => item.cart, {cascade
    : true})
    items: ShoppingCartItem[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;


}

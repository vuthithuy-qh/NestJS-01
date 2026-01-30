import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from "typeorm";
import {ShoppingCart} from "./shopping-cart.entity";
import {CatSpec} from "../../cats/entities/cat-spec.entity";

@Entity('shopping_cart_items')
export class ShoppingCartItem {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    cartId: number;

    @ManyToOne(() => ShoppingCart, cart => cart.items, { onDelete: 'CASCADE'})
    @JoinColumn({name: 'cartId'})
    cart: ShoppingCart;

    @Column()
    catSpecId : number;

    @ManyToOne(() => CatSpec)
    @JoinColumn({name : 'catSpecId'})
    catSpec : CatSpec;

    @Column({default: 1})
    qty : number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
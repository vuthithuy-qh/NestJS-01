import {
    BeforeInsert, BeforeUpdate,
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity, OneToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from "typeorm";
import {Exclude} from "class-transformer";
import {UserRole} from "../enum/user-role.enum";
import * as bcrypt from 'bcrypt';


@Entity('users')
export class User{
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    email: string;

    @Column()
    @Exclude() // Ẩn password khi trả về response
    password: string;

    @Column()
    fullName: string;

    @Column({ nullable: true })
    phone: string;

    @Column({ nullable: true })
    address: string;

    @OneToOne('ShoppingCart', (cart: any) => cart.user)
    cart: any;

    @Column({
        type:'enum',
        enum: UserRole,
        default: UserRole.USER
    })
    role: UserRole;

    @Column({ default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @DeleteDateColumn()
    deletedAt: Date;

    @BeforeInsert()
    async hashPassword() {
        if (this.password && !this.password.startsWith('$2b$')) {
            // Chỉ hash nếu password chưa được hash
            this.password = await bcrypt.hash(this.password, 10);
        }
    }

    async comparePassword(plainPassword: string): Promise<boolean> {
        return await bcrypt.compare(plainPassword, this.password);
    }

}
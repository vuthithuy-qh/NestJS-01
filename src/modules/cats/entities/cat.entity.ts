import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    ManyToOne,
    OneToMany,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    JoinColumn,
} from 'typeorm';
import { Category } from '../../category/entities/category.entity';
import { CatSpec } from './cat-spec.entity';
import { CatStatus } from '../enum/cat-status.enum';
import { CatGender } from '../enum/cat-gender.enum';

@Entity('cats')
export class Cat {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    categoryId: number;

    @ManyToOne(() => Category)
    @JoinColumn({ name: 'categoryId' })
    category: Category;

    @Column()
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ nullable: true })
    image: string;

    @Column({
        type: 'enum',
        enum: CatStatus,
        default: CatStatus.AVAILABLE,
    })
    status: CatStatus;

    @Column({
        type: 'enum',
        enum: CatGender,
    })
    gender: CatGender;

    @OneToMany(() => CatSpec, catSpec => catSpec.cat, { cascade: true })
    specs: CatSpec[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @DeleteDateColumn()
    deletedAt: Date;
}
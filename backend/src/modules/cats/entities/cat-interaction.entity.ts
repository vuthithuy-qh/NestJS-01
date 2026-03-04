import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Cat } from './cat.entity';
import { InteractionType } from '../enum/interaction-type.enum';

/**
 * Tracks user interactions with cats (views, cart adds, purchases).
 * Used by the CatRankingService to compute popularity scores.
 */
@Entity('cat_interactions')
@Index(['catId', 'type'])
@Index(['createdAt'])
export class CatInteraction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  catId: number;

  @ManyToOne(() => Cat, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'catId' })
  cat: Cat;

  /** Nullable — anonymous views are still tracked */
  @Column({ type: 'int', nullable: true })
  userId: number | null;

  @Column({ type: 'enum', enum: InteractionType })
  type: InteractionType;

  @CreateDateColumn()
  createdAt: Date;
}

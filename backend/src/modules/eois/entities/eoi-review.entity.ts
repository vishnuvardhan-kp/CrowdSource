import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { EoiReviewAction, EoiStatus } from '../../../common/enums';
import { ExpressionOfInterest } from './expression-of-interest.entity';
import { User } from '../../users/entities/user.entity';

@Entity('eoi_reviews')
export class EoiReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  eoi_id: string;

  @ManyToOne(() => ExpressionOfInterest, (eoi) => eoi.reviews, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'eoi_id' })
  eoi: ExpressionOfInterest;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  reviewer_id: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewer_id' })
  reviewer: User;

  @Column({
    type: 'enum',
    enum: EoiReviewAction,
  })
  action: EoiReviewAction;

  @Column({
    type: 'enum',
    enum: EoiStatus,
  })
  previous_status: EoiStatus;

  @Column({
    type: 'enum',
    enum: EoiStatus,
  })
  new_status: EoiStatus;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ImpactReviewDecision } from '../../../common/enums';
import { ImpactAssessment } from './impact-assessment.entity';
import { User } from '../../users/entities/user.entity';

@Entity('impact_reviews')
export class ImpactReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  impact_assessment_id: string;

  @ManyToOne(() => ImpactAssessment, (a) => a.reviews, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'impact_assessment_id' })
  assessment: ImpactAssessment;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  reviewer_id: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewer_id' })
  reviewer: User;

  @Index()
  @Column({
    type: 'enum',
    enum: ImpactReviewDecision,
  })
  decision: ImpactReviewDecision;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ReviewStatus } from '../../../common/enums';
import { Challenge } from '../../challenges/entities/challenge.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { User } from '../../users/entities/user.entity';

@Entity('recommendation_reviews')
export class RecommendationReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  challenge_id: string;

  @ManyToOne(() => Challenge, (c) => c.reviews, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'challenge_id' })
  challenge: Challenge;

  @Index()
  @Column({ type: 'uuid' })
  recommended_organization_id: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recommended_organization_id' })
  recommendedOrganization: Organization;

  @Column({ type: 'varchar', length: 50 })
  recommended_entity_type: string;

  @Column({ type: 'numeric', precision: 4, scale: 2, nullable: true })
  ai_recommendation_score: number;

  @Column({ type: 'jsonb', nullable: true })
  ai_match_reasons: Record<string, any>;

  @Index()
  @Column({
    type: 'enum',
    enum: ReviewStatus,
    default: ReviewStatus.PENDING,
  })
  human_review_status: ReviewStatus;

  @Column({ type: 'varchar', length: 100, nullable: true })
  final_decision: string;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  reviewer_id: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewer_id' })
  reviewer: User;

  @Column({ type: 'text', nullable: true })
  review_notes: string;

  @Column({ type: 'timestamptz', nullable: true })
  reviewed_at: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}

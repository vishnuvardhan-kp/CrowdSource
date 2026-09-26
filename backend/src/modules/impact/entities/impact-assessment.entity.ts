import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToOne,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { ImpactAssessmentStatus } from '../../../common/enums';
import { Project } from '../../projects/entities/project.entity';
import { User } from '../../users/entities/user.entity';
import { ImpactMetric } from './impact-metric.entity';
import { ImpactEvidence } from './impact-evidence.entity';
import { ImpactFeedback } from './impact-feedback.entity';
import { ImpactReview } from './impact-review.entity';

@Entity('impact_assessments')
export class ImpactAssessment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'uuid', unique: true })
  project_id: string;

  @OneToOne(() => Project, (proj) => proj.impactAssessment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  submitted_by_id: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'submitted_by_id' })
  submittedBy: User;

  @Index()
  @Column({
    type: 'enum',
    enum: ImpactAssessmentStatus,
    default: ImpactAssessmentStatus.IMPACT_VERIFICATION_PENDING,
  })
  status: ImpactAssessmentStatus;

  @Column({ type: 'text' })
  summary: string;

  @Column({ type: 'text' })
  problem_addressed: string;

  @Column({ type: 'text' })
  solution_implemented: string;

  @Column({ type: 'int', nullable: true })
  beneficiaries_reached: number;

  @Column({ type: 'text', nullable: true })
  geographic_coverage: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  implementation_cost: number;

  @Column({ type: 'text', nullable: true })
  sustainability_notes: string;

  @Column({ type: 'timestamptz', nullable: true })
  submitted_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  verified_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  rejected_at: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @OneToMany(() => ImpactMetric, (m) => m.assessment)
  metrics: ImpactMetric[];

  @OneToMany(() => ImpactEvidence, (e) => e.assessment)
  evidence: ImpactEvidence[];

  @OneToMany(() => ImpactFeedback, (f) => f.assessment)
  feedback: ImpactFeedback[];

  @OneToMany(() => ImpactReview, (r) => r.assessment)
  reviews: ImpactReview[];
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { EoiStatus, EoiTimeline } from '../../../common/enums';
import { Challenge } from '../../challenges/entities/challenge.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { User } from '../../users/entities/user.entity';
import { Project } from '../../projects/entities/project.entity';
import { EoiContribution } from './eoi-contribution.entity';
import { EoiEvidence } from './eoi-evidence.entity';
import { EoiReview } from './eoi-review.entity';
import { ProblemCluster } from '../../problem-clusters/entities/problem-cluster.entity';

@Entity('expression_of_interests')
export class ExpressionOfInterest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  challenge_id: string;

  @ManyToOne(() => Challenge, (c) => c.eois, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'challenge_id' })
  challenge: Challenge;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  cluster_id: string;

  @ManyToOne(() => ProblemCluster, (cl) => cl.eois, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'cluster_id' })
  cluster: ProblemCluster;

  @Index()
  @Column({ type: 'uuid' })
  organization_id: string;

  @ManyToOne(() => Organization, (org) => org.eois, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Index()
  @Column({ type: 'uuid' })
  proposer_user_id: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'proposer_user_id' })
  proposerUser: User;

  @Index()
  @Column({
    type: 'enum',
    enum: EoiStatus,
    default: EoiStatus.DRAFT,
  })
  status: EoiStatus;

  @Column({ type: 'text', nullable: true })
  motivation: string;

  @Column({ type: 'text', nullable: true })
  proposed_contribution: string;

  @Column({ type: 'text', nullable: true })
  proposed_approach: string;

  @Column({ type: 'text', nullable: true })
  resource_summary: string;

  @Column({
    type: 'enum',
    enum: EoiTimeline,
    nullable: true,
  })
  timeline: EoiTimeline;

  @Column({ type: 'text', nullable: true })
  timeline_notes: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  collaboration_lead_name: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  collaboration_lead_designation: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  collaboration_lead_email: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  collaboration_lead_phone: string;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  project_id: string;

  @ManyToOne(() => Project, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ type: 'timestamptz', nullable: true })
  submitted_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  reviewed_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  accepted_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  rejected_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  withdrawn_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  project_formed_at: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @OneToMany(() => EoiContribution, (c) => c.eoi, { cascade: true })
  contributions: EoiContribution[];

  @OneToMany(() => EoiEvidence, (e) => e.eoi, { cascade: true })
  evidence: EoiEvidence[];

  @OneToMany(() => EoiReview, (r) => r.eoi)
  reviews: EoiReview[];
}

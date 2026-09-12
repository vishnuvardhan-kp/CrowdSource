import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  OneToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { ProjectStatus } from '../../../common/enums';
import { Challenge } from '../../challenges/entities/challenge.entity';
import { InstitutionProfile } from '../../institutions/entities/institution-profile.entity';
import { IndustryProfile } from '../../industries/entities/industry-profile.entity';
import { ProjectImpact } from '../../impact/entities/project-impact.entity';
import { ImpactAssessment } from '../../impact/entities/impact-assessment.entity';
import { ProjectParticipant } from './project-participant.entity';
import { ProjectMilestone } from './project-milestone.entity';
import { ProjectDeliverable } from './project-deliverable.entity';
import { ProjectUpdate } from './project-update.entity';
import { ProjectReview } from './project-review.entity';
import { ProjectAcademicMember } from './project-academic-member.entity';
import { ProjectContribution } from './project-contribution.entity';
import { ProjectInnovationOutcome } from './project-innovation-outcome.entity';
import { ProblemCluster } from '../../problem-clusters/entities/problem-cluster.entity';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  challenge_id: string;

  @ManyToOne(() => Challenge, (c) => c.projects, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'challenge_id' })
  challenge: Challenge;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  cluster_id: string;

  @ManyToOne(() => ProblemCluster, (cl) => cl.projects, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'cluster_id' })
  cluster: ProblemCluster;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  objectives: string;

  @Column({ type: 'text', nullable: true })
  expected_outcomes: string;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  lead_institution_id: string;

  @ManyToOne(() => InstitutionProfile, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'lead_institution_id' })
  leadInstitution: InstitutionProfile;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  partner_industry_id: string;

  @ManyToOne(() => IndustryProfile, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'partner_industry_id' })
  partnerIndustry: IndustryProfile;

  @Index()
  @Column({
    type: 'enum',
    enum: ProjectStatus,
    default: ProjectStatus.PROPOSED,
  })
  status: ProjectStatus;

  @Column({ type: 'date', nullable: true })
  start_date: Date;

  @Column({ type: 'date', nullable: true })
  target_completion_date: Date;

  @Column({ type: 'date', nullable: true })
  actual_completion_date: Date;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  budget_allocated: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @OneToOne(() => ProjectImpact, (impact) => impact.project)
  impact: ProjectImpact;

  @OneToOne(() => ImpactAssessment, (ia) => ia.project)
  impactAssessment: ImpactAssessment;

  @OneToMany(() => ProjectParticipant, (participant) => participant.project)
  participants: ProjectParticipant[];

  @OneToMany(() => ProjectMilestone, (m) => m.project)
  milestones: ProjectMilestone[];

  @OneToMany(() => ProjectDeliverable, (d) => d.project)
  deliverables: ProjectDeliverable[];

  @OneToMany(() => ProjectUpdate, (u) => u.project)
  updates: ProjectUpdate[];

  @OneToMany(() => ProjectReview, (r) => r.project)
  reviews: ProjectReview[];

  @OneToMany(() => ProjectAcademicMember, (am) => am.project)
  academicMembers: ProjectAcademicMember[];

  @OneToMany(() => ProjectContribution, (c) => c.project)
  contributions: ProjectContribution[];

  @OneToMany(() => ProjectInnovationOutcome, (io) => io.project)
  innovationOutcomes: ProjectInnovationOutcome[];
}

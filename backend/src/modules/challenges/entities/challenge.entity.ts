import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { ChallengeStatus, ChallengePriority, CitizenSeverity, ClusteringStatus, ReporterType } from '../../../common/enums';
import { User } from '../../users/entities/user.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { Institution } from '../../institutions/entities/institution.entity';
import { InstitutionMembership } from '../../institutions/entities/institution-membership.entity';
import { ChallengeEvidence } from './challenge-evidence.entity';
import { ChallengeConfirmation } from './challenge-confirmation.entity';
import { District } from '../../locations/entities/district.entity';
import { Block } from '../../locations/entities/block.entity';
import { ChallengeAiAnalysis } from '../../ai-analysis/entities/challenge-ai-analysis.entity';
import { Project } from '../../projects/entities/project.entity';
import { RecommendationReview } from '../../reviews/entities/recommendation-review.entity';
import { ExpressionOfInterest } from '../../eois/entities/expression-of-interest.entity';
import { ProblemCluster } from '../../problem-clusters/entities/problem-cluster.entity';

@Entity('challenges')
export class Challenge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 300 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text', nullable: true })
  original_text: string | null;

  @Column({ type: 'varchar', length: 10, default: 'en' })
  original_language: string;

  @Column({ type: 'text', nullable: true })
  normalized_text: string | null;

  @Column({ type: 'varchar', length: 10, default: 'en' })
  processing_language: string;

  @Column({ type: 'varchar', length: 50, default: 'NOT_REQUIRED' })
  translation_status: string;

  @Column({ type: 'jsonb', nullable: true, default: () => "'{}'::jsonb" })
  translation_metadata: Record<string, any>;

  @Column({ type: 'varchar', length: 300, nullable: true })
  professional_title: string | null;

  @Column({ type: 'text', nullable: true })
  professional_problem_statement: string | null;

  @Column({ type: 'varchar', length: 50, default: 'PENDING' })
  refinement_status: string;

  @Column({ type: 'timestamptz', nullable: true })
  refined_at: Date | null;

  @Column({ type: 'jsonb', nullable: true, default: () => "'[]'::jsonb" })
  citizen_facts: string[];

  @Column({ type: 'jsonb', nullable: true, default: () => "'{}'::jsonb" })
  platform_metadata: Record<string, any>;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  submitted_by: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'submitted_by' })
  submitter: User;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  organization_id: string;

  @ManyToOne(() => Organization, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Index()
  @Column({
    type: 'enum',
    enum: ReporterType,
    default: ReporterType.INDIVIDUAL,
  })
  reporter_type: ReporterType;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  institution_id: string | null;

  @ManyToOne(() => Institution, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'institution_id' })
  institution: Institution | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  institution_membership_id: string | null;

  @ManyToOne(() => InstitutionMembership, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'institution_membership_id' })
  institutionMembership: InstitutionMembership | null;

  @Column({ type: 'jsonb', nullable: true })
  verification_snapshot: Record<string, any> | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  district_id: string;

  @ManyToOne(() => District, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'district_id' })
  districtRef: District;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  block_id: string;

  @ManyToOne(() => Block, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'block_id' })
  blockRef: Block;

  @Index()
  @Column({ type: 'varchar', length: 100, nullable: true })
  district: string;

  @Column({ type: 'varchar', length: 100, nullable: true, default: 'Jharkhand' })
  state: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  village_locality: string;

  @Column({ type: 'text', nullable: true })
  location: string;

  @Column({ type: 'numeric', precision: 10, scale: 7, nullable: true })
  latitude: number;

  @Column({ type: 'numeric', precision: 10, scale: 7, nullable: true })
  longitude: number;

  @Index()
  @Column({
    type: 'enum',
    enum: ChallengeStatus,
    default: ChallengeStatus.DRAFT,
  })
  status: ChallengeStatus;

  @Column({
    type: 'enum',
    enum: ChallengePriority,
    default: ChallengePriority.MEDIUM,
  })
  priority: ChallengePriority;

  @Column({
    type: 'enum',
    enum: CitizenSeverity,
    nullable: true,
  })
  citizen_severity: CitizenSeverity;

  @Column({ type: 'varchar', length: 100, nullable: true })
  affected_population: string;

  @Index()
  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string;

  @Column({ type: 'timestamptz', nullable: true })
  submitted_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  validated_at: Date;

  @Column({ type: 'text', nullable: true })
  rejection_reason: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @OneToMany(() => ChallengeEvidence, (ev) => ev.challenge)
  evidence: ChallengeEvidence[];

  @OneToMany(() => ChallengeConfirmation, (c) => c.challenge)
  confirmations: ChallengeConfirmation[];

  @OneToOne(() => ChallengeAiAnalysis, (ai) => ai.challenge)
  aiAnalysis: ChallengeAiAnalysis;

  @OneToMany(() => Project, (proj) => proj.challenge)
  projects: Project[];

  @OneToMany(() => RecommendationReview, (rev) => rev.challenge)
  reviews: RecommendationReview[];

  @OneToMany(() => ExpressionOfInterest, (eoi) => eoi.challenge)
  eois: ExpressionOfInterest[];

  @OneToMany('ProposedSolution', (sol: any) => sol.challenge)
  proposedSolutions: any[];

  @Index()
  @Column({ type: 'uuid', nullable: true })
  cluster_id: string;

  @ManyToOne(() => ProblemCluster, (cl) => cl.reports, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'cluster_id' })
  cluster: ProblemCluster;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  potential_cluster_id: string;

  @ManyToOne(() => ProblemCluster, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'potential_cluster_id' })
  potentialCluster: ProblemCluster;

  @Column({
    type: 'enum',
    enum: ClusteringStatus,
    default: ClusteringStatus.INDEPENDENT,
  })
  clustering_status: ClusteringStatus;
}

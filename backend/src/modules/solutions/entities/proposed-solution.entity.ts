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
import {
  ProposedSolutionStatus,
  SolutionVisibility,
} from '../../../common/enums';
import { Challenge } from '../../challenges/entities/challenge.entity';
import { ProblemCluster } from '../../problem-clusters/entities/problem-cluster.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { User } from '../../users/entities/user.entity';
import { Project } from '../../projects/entities/project.entity';
import { SolutionTeamMember } from './solution-team-member.entity';
import { SolutionDocument } from './solution-document.entity';
import { SolutionCollaboration } from './solution-collaboration.entity';

@Entity('proposed_solutions')
export class ProposedSolution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  challenge_id: string;

  @ManyToOne(() => Challenge, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'challenge_id' })
  challenge: Challenge;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  cluster_id: string | null;

  @ManyToOne(() => ProblemCluster, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'cluster_id' })
  cluster: ProblemCluster;

  @Index()
  @Column({ type: 'uuid' })
  proposing_organization_id: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'proposing_organization_id' })
  proposingOrganization: Organization;

  @Column({ type: 'varchar', length: 300 })
  title: string;

  @Column({ type: 'text', nullable: true })
  executive_summary: string;

  @Column({ type: 'text', nullable: true })
  problem_understanding: string;

  @Column({ type: 'text', nullable: true })
  proposed_approach: string;

  @Column({ type: 'text', nullable: true })
  technical_approach: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  required_capabilities: string[];

  @Column({ type: 'text', nullable: true })
  expected_outcomes: string;

  @Column({ type: 'text', nullable: true })
  expected_social_impact: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  estimated_budget: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  estimated_timeline: string;

  @Column({ type: 'text', nullable: true })
  required_resources: string;

  @Column({ type: 'text', nullable: true })
  prototype_requirements: string;

  @Column({ type: 'text', nullable: true })
  deployment_requirements: string;

  @Column({ type: 'text', nullable: true })
  innovation_potential: string;

  @Column({ type: 'text', nullable: true })
  ip_potential: string;

  @Column({ type: 'text', nullable: true })
  rejection_reason: string | null;

  @Column({ type: 'text', nullable: true })
  review_notes: string | null;

  @Index()
  @Column({
    type: 'enum',
    enum: ProposedSolutionStatus,
    default: ProposedSolutionStatus.DRAFT,
  })
  status: ProposedSolutionStatus;

  @Index()
  @Column({
    type: 'enum',
    enum: SolutionVisibility,
    default: SolutionVisibility.PUBLIC,
  })
  visibility: SolutionVisibility;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  project_id: string | null;

  @ManyToOne(() => Project, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Index()
  @Column({ type: 'uuid' })
  created_by: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @Column({ type: 'timestamptz', nullable: true })
  submitted_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  published_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  converted_at: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @OneToMany(() => SolutionTeamMember, (m) => m.solution, { cascade: true })
  teamMembers: SolutionTeamMember[];

  @OneToMany(() => SolutionDocument, (d) => d.solution, { cascade: true })
  documents: SolutionDocument[];

  @OneToMany(() => SolutionCollaboration, (c) => c.solution, { cascade: true })
  collaborations: SolutionCollaboration[];
}

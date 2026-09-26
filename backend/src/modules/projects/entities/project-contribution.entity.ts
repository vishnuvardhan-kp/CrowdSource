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
import {
  ProjectContributionType,
  ContributionStatus,
  ContributionVisibility,
} from '../../../common/enums';
import { Project } from './project.entity';
import { ProjectParticipant } from './project-participant.entity';
import { User } from '../../users/entities/user.entity';

@Entity('project_contributions')
export class ProjectContribution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  project_id: string;

  @ManyToOne(() => Project, (p) => p.contributions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Index()
  @Column({ type: 'uuid' })
  participant_id: string;

  @ManyToOne(() => ProjectParticipant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'participant_id' })
  participant: ProjectParticipant;

  @Index()
  @Column({
    type: 'enum',
    enum: ProjectContributionType,
  })
  contribution_type: ProjectContributionType;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Index()
  @Column({
    type: 'enum',
    enum: ContributionStatus,
    default: ContributionStatus.PROPOSED,
  })
  status: ContributionStatus;

  @Column({
    type: 'enum',
    enum: ContributionVisibility,
    default: ContributionVisibility.CONSORTIUM,
  })
  visibility: ContributionVisibility;

  @Index()
  @Column({ type: 'boolean', default: false })
  is_required: boolean;

  @Column({ type: 'numeric', precision: 14, scale: 2, nullable: true })
  value: number | null;

  @Column({ type: 'varchar', length: 10, default: 'INR' })
  currency: string;

  @Column({ type: 'text', nullable: true })
  evidence_url: string | null;

  @Column({ type: 'jsonb', nullable: true })
  transfer_details: Record<string, any> | null;

  @Column({ type: 'text', nullable: true })
  verification_notes: string | null;

  @Column({ type: 'uuid', nullable: true })
  verified_by_id: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'verified_by_id' })
  verifiedBy: User;

  @Column({ type: 'timestamptz', nullable: true })
  verified_at: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}

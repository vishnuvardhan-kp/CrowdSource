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
  InnovationOutcomeType,
  InnovationOutcomeStatus,
} from '../../../common/enums';
import { Project } from './project.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { User } from '../../users/entities/user.entity';

@Entity('project_innovation_outcomes')
export class ProjectInnovationOutcome {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  project_id: string;

  @ManyToOne(() => Project, (p) => p.innovationOutcomes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Index()
  @Column({
    type: 'enum',
    enum: InnovationOutcomeType,
  })
  outcome_type: InnovationOutcomeType;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Index()
  @Column({
    type: 'enum',
    enum: InnovationOutcomeStatus,
    default: InnovationOutcomeStatus.PROPOSED,
  })
  status: InnovationOutcomeStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reference_number: string | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  organization_id: string | null;

  @ManyToOne(() => Organization, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization | null;

  @Column({ type: 'uuid', nullable: true })
  created_by_user_id: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_user_id' })
  createdByUser: User | null;

  @Column({ type: 'uuid', nullable: true })
  verified_by_user_id: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'verified_by_user_id' })
  verifiedByUser: User | null;

  @Column({ type: 'timestamptz', nullable: true })
  verified_at: Date | null;

  @Column({ type: 'text', nullable: true })
  verification_notes: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}

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
  SolutionCollaborationType,
  SolutionCollaborationStatus,
} from '../../../common/enums';
import { ProposedSolution } from './proposed-solution.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { User } from '../../users/entities/user.entity';

@Entity('solution_collaborations')
export class SolutionCollaboration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  solution_id: string;

  @ManyToOne(() => ProposedSolution, (s) => s.collaborations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'solution_id' })
  solution: ProposedSolution;

  @Index()
  @Column({ type: 'uuid' })
  offering_organization_id: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'offering_organization_id' })
  offeringOrganization: Organization;

  @Index()
  @Column({ type: 'uuid' })
  offering_user_id: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'offering_user_id' })
  offeringUser: User;

  @Index()
  @Column({
    type: 'enum',
    enum: SolutionCollaborationType,
  })
  collaboration_type: SolutionCollaborationType;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  financial_contribution: number | null;

  @Column({ type: 'text', nullable: true })
  resources_offered: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  estimated_timeline: string | null;

  @Index()
  @Column({
    type: 'enum',
    enum: SolutionCollaborationStatus,
    default: SolutionCollaborationStatus.OFFERED,
  })
  status: SolutionCollaborationStatus;

  @Column({ type: 'text', nullable: true })
  discussion_notes: string | null;

  @Column({ type: 'text', nullable: true })
  response_notes: string | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  reviewed_by: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewed_by' })
  reviewer: User | null;

  @Column({ type: 'timestamptz', nullable: true })
  accepted_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  declined_at: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}

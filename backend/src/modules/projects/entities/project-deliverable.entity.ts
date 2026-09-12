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
import { DeliverableDocumentType } from '../../../common/enums';
import { Project } from './project.entity';
import { ProjectMilestone } from './project-milestone.entity';
import { ProjectParticipant } from './project-participant.entity';
import { User } from '../../users/entities/user.entity';

@Entity('project_deliverables')
export class ProjectDeliverable {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  project_id: string;

  @ManyToOne(() => Project, (p) => p.deliverables, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  milestone_id: string | null;

  @ManyToOne(() => ProjectMilestone, (m) => m.deliverables, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'milestone_id' })
  milestone: ProjectMilestone | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  uploaded_by_participant_id: string | null;

  @ManyToOne(() => ProjectParticipant, (p) => p.deliverables, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'uploaded_by_participant_id' })
  uploadedByParticipant: ProjectParticipant | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  uploaded_by_user_id: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'uploaded_by_user_id' })
  uploadedByUser: User | null;

  @Index()
  @Column({
    type: 'enum',
    enum: DeliverableDocumentType,
    default: DeliverableDocumentType.REPORT,
  })
  document_type: DeliverableDocumentType;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 255 })
  storage_key: string;

  @Column({ type: 'varchar', length: 255 })
  file_name: string;

  @Column({ type: 'varchar', length: 100 })
  mime_type: string;

  @Column({ type: 'bigint' })
  file_size: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}

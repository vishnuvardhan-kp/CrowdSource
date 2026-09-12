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
import { ProjectUpdateType } from '../../../common/enums';
import { Project } from './project.entity';
import { ProjectParticipant } from './project-participant.entity';
import { User } from '../../users/entities/user.entity';
import { ProjectReview } from './project-review.entity';

@Entity('project_updates')
export class ProjectUpdate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  project_id: string;

  @ManyToOne(() => Project, (p) => p.updates, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  author_participant_id: string | null;

  @ManyToOne(() => ProjectParticipant, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'author_participant_id' })
  authorParticipant: ProjectParticipant | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  author_user_id: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'author_user_id' })
  authorUser: User | null;

  @Index()
  @Column({
    type: 'enum',
    enum: ProjectUpdateType,
    default: ProjectUpdateType.PROGRESS,
  })
  update_type: ProjectUpdateType;

  @Column({ type: 'varchar', length: 255 })
  summary: string;

  @Column({ type: 'text', nullable: true })
  details: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  blocker_status: string | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  resolved_by_review_id: string | null;

  @ManyToOne(() => ProjectReview, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'resolved_by_review_id' })
  resolvedByReview: ProjectReview | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}

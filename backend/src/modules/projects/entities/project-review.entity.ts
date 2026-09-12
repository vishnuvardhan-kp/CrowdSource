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
import { ProjectReviewAction } from '../../../common/enums';
import { Project } from './project.entity';
import { ProjectMilestone } from './project-milestone.entity';
import { User } from '../../users/entities/user.entity';

@Entity('project_reviews')
export class ProjectReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  project_id: string;

  @ManyToOne(() => Project, (p) => p.reviews, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  milestone_id: string | null;

  @ManyToOne(() => ProjectMilestone, (m) => m.reviews, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'milestone_id' })
  milestone: ProjectMilestone | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  reviewer_user_id: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewer_user_id' })
  reviewerUser: User | null;

  @Index()
  @Column({
    type: 'enum',
    enum: ProjectReviewAction,
  })
  action: ProjectReviewAction;

  @Column({ type: 'text', nullable: true })
  comments: string | null;

  @Column({ type: 'jsonb', nullable: true })
  feedback: Record<string, any> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}

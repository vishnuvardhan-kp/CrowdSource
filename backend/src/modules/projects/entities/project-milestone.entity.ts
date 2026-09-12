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
import { MilestoneStatus } from '../../../common/enums';
import { Project } from './project.entity';
import { ProjectTask } from './project-task.entity';
import { ProjectDeliverable } from './project-deliverable.entity';
import { ProjectReview } from './project-review.entity';

@Entity('project_milestones')
export class ProjectMilestone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  project_id: string;

  @ManyToOne(() => Project, (p) => p.milestones, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'date', nullable: true })
  due_date: Date;

  @Index()
  @Column({
    type: 'enum',
    enum: MilestoneStatus,
    default: MilestoneStatus.PENDING,
  })
  status: MilestoneStatus;

  @Column({ type: 'int', default: 1 })
  order_index: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @OneToMany(() => ProjectTask, (t) => t.milestone)
  tasks: ProjectTask[];

  @OneToMany(() => ProjectDeliverable, (d) => d.milestone)
  deliverables: ProjectDeliverable[];

  @OneToMany(() => ProjectReview, (r) => r.milestone)
  reviews: ProjectReview[];
}

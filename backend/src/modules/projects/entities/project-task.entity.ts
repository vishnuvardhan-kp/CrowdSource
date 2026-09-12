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
import { TaskStatus } from '../../../common/enums';
import { ProjectMilestone } from './project-milestone.entity';
import { ProjectParticipant } from './project-participant.entity';

@Entity('project_tasks')
export class ProjectTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  milestone_id: string;

  @ManyToOne(() => ProjectMilestone, (m) => m.tasks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'milestone_id' })
  milestone: ProjectMilestone;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  assigned_participant_id: string;

  @ManyToOne(() => ProjectParticipant, (p) => p.assignedTasks, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'assigned_participant_id' })
  assignedParticipant: ProjectParticipant;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Index()
  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.TODO,
  })
  status: TaskStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}

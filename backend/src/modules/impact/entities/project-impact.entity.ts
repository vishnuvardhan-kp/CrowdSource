import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToOne,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { User } from '../../users/entities/user.entity';

@Entity('project_impacts')
export class ProjectImpact {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'uuid', unique: true })
  project_id: string;

  @OneToOne(() => Project, (proj) => proj.impact, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ type: 'int', nullable: true })
  people_benefited: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  cost_saved: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  time_saved: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  efficiency_improvement: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  coverage_area: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  adoption_rate: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  deployment_status: string;

  @Column({ type: 'numeric', precision: 3, scale: 2, nullable: true })
  community_feedback_score: number;

  @Column({ type: 'jsonb', nullable: true })
  impact_metrics: Record<string, any>;

  @Column({ type: 'timestamptz', nullable: true })
  verified_at: Date;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  verified_by: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'verified_by' })
  verifier: User;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}

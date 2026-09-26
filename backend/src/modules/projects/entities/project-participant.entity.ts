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
import { Project } from './project.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { ExpressionOfInterest } from '../../eois/entities/expression-of-interest.entity';
import { ProjectTask } from './project-task.entity';
import { ProjectDeliverable } from './project-deliverable.entity';

@Entity('project_participants')
export class ProjectParticipant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  project_id: string;

  @ManyToOne(() => Project, (project) => project.participants, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Index()
  @Column({ type: 'uuid' })
  organization_id: string;

  @ManyToOne(() => Organization, (org) => org.projectParticipations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  source_eoi_id: string;

  @ManyToOne(() => ExpressionOfInterest, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'source_eoi_id' })
  sourceEoi: ExpressionOfInterest;

  @Column({ type: 'varchar', length: 100, default: 'PARTNER' })
  participant_role: string;

  @Column({ type: 'varchar', length: 50, default: 'ACTIVE' })
  status: string;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  joined_at: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @OneToMany(() => ProjectTask, (task) => task.assignedParticipant)
  assignedTasks: ProjectTask[];

  @OneToMany(() => ProjectDeliverable, (deliverable) => deliverable.uploadedByParticipant)
  deliverables: ProjectDeliverable[];
}

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
import { AcademicMemberRole, AcademicMemberStatus } from '../../../common/enums';
import { Project } from './project.entity';
import { User } from '../../users/entities/user.entity';
import { Organization } from '../../organizations/entities/organization.entity';

@Entity('project_academic_members')
@Index(['project_id', 'user_id'], { unique: true })
export class ProjectAcademicMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  project_id: string;

  @ManyToOne(() => Project, (p) => p.academicMembers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Index()
  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Index()
  @Column({ type: 'uuid' })
  organization_id: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Index()
  @Column({
    type: 'enum',
    enum: AcademicMemberRole,
  })
  role: AcademicMemberRole;

  @Column({ type: 'varchar', length: 255, nullable: true })
  department: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  specialization: string | null;

  @Column({
    type: 'enum',
    enum: AcademicMemberStatus,
    default: AcademicMemberStatus.ACTIVE,
  })
  status: AcademicMemberStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  joined_at: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}

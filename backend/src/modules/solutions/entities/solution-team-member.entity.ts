import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SolutionTeamRole } from '../../../common/enums';
import { ProposedSolution } from './proposed-solution.entity';
import { User } from '../../users/entities/user.entity';
import { Organization } from '../../organizations/entities/organization.entity';

@Entity('solution_team_members')
export class SolutionTeamMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  solution_id: string;

  @ManyToOne(() => ProposedSolution, (s) => s.teamMembers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'solution_id' })
  solution: ProposedSolution;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  user_id: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Index()
  @Column({ type: 'uuid' })
  organization_id: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({
    type: 'enum',
    enum: SolutionTeamRole,
    default: SolutionTeamRole.FACULTY_MENTOR,
  })
  role: SolutionTeamRole;

  @Column({ type: 'varchar', length: 255, nullable: true })
  department: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  designation: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  degree_program: string | null;

  @Column({ type: 'int', nullable: true })
  student_year: number | null;

  @Column({ type: 'int', nullable: true })
  weekly_commitment_hours: number | null;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  specialization_skills: string[];

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { ImpactAssessment } from './impact-assessment.entity';
import { User } from '../../users/entities/user.entity';

@Entity('impact_feedback')
@Unique('uq_impact_feedback_assessment_user', ['impact_assessment_id', 'submitted_by_id'])
export class ImpactFeedback {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  impact_assessment_id: string;

  @ManyToOne(() => ImpactAssessment, (a) => a.feedback, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'impact_assessment_id' })
  assessment: ImpactAssessment;

  @Index()
  @Column({ type: 'uuid' })
  submitted_by_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'submitted_by_id' })
  submittedBy: User;

  @Column({ type: 'int' })
  rating: number;

  @Column({ type: 'text' })
  feedback: string;

  @Column({ type: 'boolean', default: false })
  benefit_confirmed: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}

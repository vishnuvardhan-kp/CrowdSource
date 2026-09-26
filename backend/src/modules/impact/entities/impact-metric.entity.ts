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
import { ImpactMetricCategory } from '../../../common/enums';
import { ImpactAssessment } from './impact-assessment.entity';

@Entity('impact_metrics')
export class ImpactMetric {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  impact_assessment_id: string;

  @ManyToOne(() => ImpactAssessment, (a) => a.metrics, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'impact_assessment_id' })
  assessment: ImpactAssessment;

  @Index()
  @Column({
    type: 'enum',
    enum: ImpactMetricCategory,
  })
  metric_category: ImpactMetricCategory;

  @Column({ type: 'varchar', length: 255 })
  metric_name: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  baseline_value: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  target_value: string;

  @Column({ type: 'varchar', length: 100 })
  actual_value: string;

  @Column({ type: 'varchar', length: 50 })
  unit: string;

  @Column({ type: 'text' })
  measurement_method: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}

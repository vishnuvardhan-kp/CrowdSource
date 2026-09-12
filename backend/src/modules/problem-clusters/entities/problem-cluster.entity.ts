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
import { ChallengePriority, ProblemClusterStatus, ClusteringStatus } from '../../../common/enums';
import { District } from '../../locations/entities/district.entity';
import { Block } from '../../locations/entities/block.entity';
import { User } from '../../users/entities/user.entity';
import { Challenge } from '../../challenges/entities/challenge.entity';
import { ExpressionOfInterest } from '../../eois/entities/expression-of-interest.entity';
import { Project } from '../../projects/entities/project.entity';

@Entity('problem_clusters')
export class ProblemCluster {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 300 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Index()
  @Column({ type: 'varchar', length: 100, default: 'General' })
  category: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  subcategory: string;

  @Index()
  @Column({ type: 'varchar', length: 100 })
  district: string;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  district_id: string;

  @ManyToOne(() => District, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'district_id' })
  districtRef: District;

  @Column({ type: 'varchar', length: 100, nullable: true })
  block: string;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  block_id: string;

  @ManyToOne(() => Block, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'block_id' })
  blockRef: Block;

  @Column({ type: 'varchar', length: 255, nullable: true })
  village_locality: string;

  @Column({ type: 'text', nullable: true })
  location: string;

  @Column({ type: 'numeric', precision: 10, scale: 7, nullable: true })
  latitude: number;

  @Column({ type: 'numeric', precision: 10, scale: 7, nullable: true })
  longitude: number;

  @Column({ type: 'int', default: 1 })
  report_count: number;

  @Column({ type: 'int', default: 0 })
  evidence_count: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  affected_population: string;

  @Column({ type: 'varchar', length: 50, default: 'MODERATE' })
  severity: string;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 50.0 })
  priority_score: number;

  @Index()
  @Column({
    type: 'enum',
    enum: ChallengePriority,
    default: ChallengePriority.MEDIUM,
  })
  priority: ChallengePriority;

  @Column({ type: 'jsonb', nullable: true, default: () => "'[]'::jsonb" })
  priority_reasons: string[];

  @Index()
  @Column({
    type: 'enum',
    enum: ProblemClusterStatus,
    default: ProblemClusterStatus.AWAITING_GOVERNMENT_VERIFICATION,
  })
  status: ProblemClusterStatus;

  @Column({ type: 'varchar', length: 50, default: 'PENDING' })
  government_verification_status: string;

  @Column({ type: 'timestamptz', nullable: true })
  verified_at: Date;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  verified_by: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'verified_by' })
  verifier: User;

  @Column({ type: 'text', nullable: true })
  rejection_reason: string;

  @Column({ type: 'numeric', precision: 4, scale: 3, default: 0.85 })
  ai_confidence: number;

  @Column({ type: 'varchar', length: 50, default: 'SUCCESS' })
  ai_processing_status: string;

  @Column({ type: 'jsonb', nullable: true })
  ai_reasoning: Record<string, any>;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @OneToMany(() => Challenge, (c) => c.cluster)
  reports: Challenge[];

  @OneToMany(() => ExpressionOfInterest, (eoi) => eoi.cluster)
  eois: ExpressionOfInterest[];

  @OneToMany(() => Project, (proj) => proj.cluster)
  projects: Project[];
}

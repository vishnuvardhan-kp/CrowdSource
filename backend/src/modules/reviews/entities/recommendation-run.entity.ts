import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Challenge } from '../../challenges/entities/challenge.entity';

@Entity('recommendation_runs')
export class RecommendationRun {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  challenge_id: string;

  @ManyToOne(() => Challenge, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'challenge_id' })
  challenge: Challenge;

  @Column({ type: 'varchar', length: 50, default: 'v1.0' })
  embedding_version: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  model_name: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  reranker_model: string;

  @Column({ type: 'jsonb' })
  scoring_config: Record<string, any>;

  @Column({ type: 'int', default: 0 })
  candidate_pool_size: number;

  @Column({ type: 'int', default: 0 })
  total_matched: number;

  @CreateDateColumn({ type: 'timestamptz' })
  run_timestamp: Date;
}

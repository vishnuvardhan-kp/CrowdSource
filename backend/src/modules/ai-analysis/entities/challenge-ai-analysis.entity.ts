import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Challenge } from '../../challenges/entities/challenge.entity';

@Entity('challenge_ai_analysis')
export class ChallengeAiAnalysis {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'uuid', unique: true })
  challenge_id: string;

  @OneToOne(() => Challenge, (c) => c.aiAnalysis, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'challenge_id' })
  challenge: Challenge;

  @Column({ type: 'varchar', length: 100, nullable: true })
  domain: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  subdomain: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  sub_category: string;

  @Column({ type: 'text', nullable: true })
  summary: string;

  @Column({ type: 'numeric', precision: 4, scale: 2, nullable: true })
  priority_score: number;

  @Column({ type: 'numeric', precision: 4, scale: 2, nullable: true })
  severity_score: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  affected_population: string;

  @Column({ type: 'jsonb', nullable: true })
  extracted_entities: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true, default: () => "'[]'::jsonb" })
  required_capabilities: string[];

  @Column({ type: 'jsonb', nullable: true, default: () => "'[]'::jsonb" })
  required_technologies: string[];

  @Column({ type: 'jsonb', nullable: true, default: () => "'[]'::jsonb" })
  keywords: string[];

  @Column({ type: 'varchar', length: 50, default: 'SUCCESS' })
  ai_processing_status: string;

  @Index()
  @Column({ type: 'varchar', length: 100, nullable: true })
  duplicate_group: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  embedding_reference: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  model_name: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  model_version: string;

  @Column({ type: 'numeric', precision: 4, scale: 3, nullable: true })
  confidence: number;

  @Column({ type: 'jsonb', nullable: true })
  raw_analysis: Record<string, any>;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

import { IndexingStatus } from '../../../common/enums';

export enum EntityEmbeddingType {
  CHALLENGE = 'CHALLENGE',
  ORGANIZATION = 'ORGANIZATION',
  CAPABILITY = 'CAPABILITY',
  INSTITUTION_PROFILE = 'INSTITUTION_PROFILE',
  INDUSTRY_PROFILE = 'INDUSTRY_PROFILE',
}

@Entity('entity_embeddings')
export class EntityEmbedding {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({
    type: 'enum',
    enum: EntityEmbeddingType,
    default: EntityEmbeddingType.CHALLENGE,
  })
  entity_type: EntityEmbeddingType;

  @Index()
  @Column({ type: 'uuid' })
  entity_id: string;

  @Index()
  @Column({ type: 'varchar', length: 50, default: 'v1.0' })
  embedding_version: string;

  @Column({ type: 'varchar', length: 50, default: 'mock' })
  model_provider: string;

  @Column({ type: 'varchar', length: 150, default: 'nvidia/nv-embed-v1' })
  model_name: string;

  @Column({ type: 'varchar', length: 50, default: '1.0' })
  model_version: string;

  @Column({ type: 'int', default: 1024 })
  dimensions: number;

  @Column({ type: 'text' })
  source_text: string;

  @Index()
  @Column({ type: 'varchar', length: 64 })
  source_text_hash: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  // Stored as floating point array in PostgreSQL
  @Column({ type: 'jsonb', nullable: true })
  embedding: number[];

  @Index()
  @Column({
    type: 'enum',
    enum: IndexingStatus,
    default: IndexingStatus.ACTIVE,
  })
  indexing_status: IndexingStatus;

  @Column({ type: 'timestamptz', nullable: true })
  indexing_requested_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  last_indexed_at: Date;

  @Column({ type: 'int', default: 0 })
  indexing_attempts: number;

  @Column({ type: 'text', nullable: true })
  last_indexing_error: string;

  @Index()
  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}

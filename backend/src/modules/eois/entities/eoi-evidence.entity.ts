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
import { EoiEvidenceType } from '../../../common/enums';
import { ExpressionOfInterest } from './expression-of-interest.entity';
import { User } from '../../users/entities/user.entity';

@Entity('eoi_evidence')
export class EoiEvidence {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  eoi_id: string;

  @ManyToOne(() => ExpressionOfInterest, (eoi) => eoi.evidence, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'eoi_id' })
  eoi: ExpressionOfInterest;

  @Column({
    type: 'enum',
    enum: EoiEvidenceType,
    default: EoiEvidenceType.OTHER,
  })
  evidence_type: EoiEvidenceType;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 255 })
  storage_key: string;

  @Column({ type: 'varchar', length: 255 })
  file_name: string;

  @Column({ type: 'varchar', length: 100 })
  mime_type: string;

  @Column({ type: 'bigint' })
  file_size: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  uploaded_by: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'uploaded_by' })
  uploader: User;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}

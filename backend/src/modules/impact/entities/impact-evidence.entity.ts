import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ImpactEvidenceType } from '../../../common/enums';
import { ImpactAssessment } from './impact-assessment.entity';
import { User } from '../../users/entities/user.entity';

@Entity('impact_evidence')
export class ImpactEvidence {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  impact_assessment_id: string;

  @ManyToOne(() => ImpactAssessment, (a) => a.evidence, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'impact_assessment_id' })
  assessment: ImpactAssessment;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  uploaded_by_id: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'uploaded_by_id' })
  uploadedBy: User;

  @Column({ type: 'text' })
  file_url: string;

  @Column({ type: 'varchar', length: 255 })
  storage_key: string;

  @Index()
  @Column({
    type: 'enum',
    enum: ImpactEvidenceType,
  })
  document_type: ImpactEvidenceType;

  @Column({ type: 'varchar', length: 255 })
  file_name: string;

  @Column({ type: 'varchar', length: 100 })
  mime_type: string;

  @Column({ type: 'bigint' })
  file_size: number;

  @Column({ type: 'varchar', length: 64 })
  checksum: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}

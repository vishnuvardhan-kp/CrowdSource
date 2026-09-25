import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { InstitutionEvidenceType } from '../../../common/enums';
import { InstitutionMembership } from './institution-membership.entity';

@Entity('institution_evidence')
export class InstitutionEvidence {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  membership_id: string;

  @ManyToOne(() => InstitutionMembership, (m) => m.evidence, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'membership_id' })
  membership: InstitutionMembership;

  @Column({
    type: 'enum',
    enum: InstitutionEvidenceType,
  })
  evidence_type: InstitutionEvidenceType;

  @Column({ type: 'text' })
  document_url: string;

  @Column({ type: 'varchar', length: 255 })
  document_name: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  mime_type: string | null;

  @Column({ type: 'integer', nullable: true })
  file_size: number | null;

  @CreateDateColumn({ type: 'timestamptz' })
  uploaded_at: Date;

  @Column({ type: 'boolean', default: false })
  verified: boolean;

  @Column({ type: 'text', nullable: true })
  review_notes: string | null;
}

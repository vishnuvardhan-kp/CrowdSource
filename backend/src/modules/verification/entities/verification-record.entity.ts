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
import { VerificationStatus } from '../../../common/enums';
import { User } from '../../users/entities/user.entity';

@Entity('verification_records')
export class VerificationRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 100 })
  entity_type: string;

  @Index()
  @Column({ type: 'uuid' })
  entity_id: string;

  @Index()
  @Column({
    type: 'enum',
    enum: VerificationStatus,
    default: VerificationStatus.PENDING_VERIFICATION,
  })
  verification_status: VerificationStatus;

  @Column({ type: 'varchar', length: 100 })
  verification_source: string;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  verified_by: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'verified_by' })
  verifier: User;

  @Column({ type: 'timestamptz', nullable: true })
  verified_at: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  jurisdiction: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  verifier_role: string | null;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  evidence_url: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}

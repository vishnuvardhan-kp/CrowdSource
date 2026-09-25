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
  Unique,
} from 'typeorm';
import {
  RepresentativeRelationship,
  AuthorityVerificationStatus,
  AuthorityVerificationSource,
} from '../../../common/enums';
import { User } from '../../users/entities/user.entity';
import { Institution } from './institution.entity';
import { InstitutionEvidence } from './institution-evidence.entity';

@Entity('institution_memberships')
@Unique(['user_id', 'institution_id'])
export class InstitutionMembership {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Index()
  @Column({ type: 'uuid' })
  institution_id: string;

  @ManyToOne(() => Institution, (i) => i.memberships, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'institution_id' })
  institution: Institution;

  @Column({
    type: 'enum',
    enum: RepresentativeRelationship,
  })
  relationship: RepresentativeRelationship;

  @Column({ type: 'varchar', length: 150 })
  designation: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  official_email: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  official_phone: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  department_name: string | null;

  @Column({ type: 'varchar', length: 50, default: 'VERIFIED' })
  identity_verification_status: string;

  @Index()
  @Column({
    type: 'enum',
    enum: AuthorityVerificationStatus,
    default: AuthorityVerificationStatus.PENDING,
  })
  authority_status: AuthorityVerificationStatus;

  @Column({
    type: 'enum',
    enum: AuthorityVerificationSource,
    default: AuthorityVerificationSource.AUTHORIZED_DOCUMENT_REVIEW,
  })
  authority_source: AuthorityVerificationSource;

  @Column({ type: 'varchar', length: 255, nullable: true })
  authority_verification_reference: string | null;

  @Column({
    type: 'enum',
    enum: RepresentativeRelationship,
    nullable: true,
  })
  verified_relationship: RepresentativeRelationship | null;

  @Column({ type: 'timestamptz', nullable: true })
  verified_at: Date | null;

  @Column({ type: 'uuid', nullable: true })
  verified_by: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'verified_by' })
  verifier: User | null;

  @Column({ type: 'text', nullable: true })
  verification_notes: string | null;

  @Column({ type: 'text', nullable: true })
  rejection_reason: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  valid_until: Date | null;

  @Column({ type: 'jsonb', nullable: true, default: () => "'{}'::jsonb" })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @OneToMany(() => InstitutionEvidence, (e) => e.membership)
  evidence: InstitutionEvidence[];
}

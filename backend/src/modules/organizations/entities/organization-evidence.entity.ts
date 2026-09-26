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
import { EvidenceType, VerificationStatus } from '../../../common/enums';
import { Organization } from './organization.entity';
import { User } from '../../users/entities/user.entity';
import { InstitutionCapability } from '../../institutions/entities/institution-capability.entity';
import { IndustryCapability } from '../../industries/entities/industry-capability.entity';
import { Capability } from '../../capabilities/entities/capability.entity';

@Entity('organization_evidence')
export class OrganizationEvidence {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  organization_id: string;

  @ManyToOne(() => Organization, (org) => org.evidence, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  institution_capability_id: string;

  @ManyToOne(() => InstitutionCapability, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'institution_capability_id' })
  institutionCapability: InstitutionCapability;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  industry_capability_id: string;

  @ManyToOne(() => IndustryCapability, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'industry_capability_id' })
  industryCapability: IndustryCapability;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  capability_id: string;

  @ManyToOne(() => Capability, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'capability_id' })
  capability: Capability;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  uploaded_by: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'uploaded_by' })
  uploader: User;

  @Column({
    type: 'enum',
    enum: EvidenceType,
    default: EvidenceType.DOCUMENT,
  })
  evidence_type: EvidenceType;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 1000 })
  url: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  mime_type: string;

  @Column({ type: 'boolean', default: false })
  is_public: boolean;

  @Index()
  @Column({
    type: 'enum',
    enum: VerificationStatus,
    default: VerificationStatus.UNVERIFIED,
  })
  verification_status: VerificationStatus;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  verified_by: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'verified_by' })
  verifier: User;

  @Column({ type: 'timestamptz', nullable: true })
  verified_at: Date;

  @Column({ type: 'text', nullable: true })
  verification_notes: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}

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
import { IndustryProfile } from './industry-profile.entity';
import { Capability } from '../../capabilities/entities/capability.entity';
import { IndustrySupportType } from './industry-support-type.entity';
import { CapabilitySource, VerificationStatus } from '../../../common/enums';

@Entity('industry_capabilities')
export class IndustryCapability {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  industry_id: string;

  @ManyToOne(() => IndustryProfile, (ind) => ind.capabilities, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'industry_id' })
  industry: IndustryProfile;

  @Index()
  @Column({ type: 'uuid' })
  capability_id: string;

  @ManyToOne(() => Capability, (c) => c.industryCapabilities, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'capability_id' })
  capability: Capability;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  support_type_id: string;

  @ManyToOne(() => IndustrySupportType, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'support_type_id' })
  supportType: IndustrySupportType;

  @Column({
    type: 'enum',
    enum: CapabilitySource,
    default: CapabilitySource.ORGANIZATION_PROVIDED,
  })
  source: CapabilitySource;

  @Index()
  @Column({
    type: 'enum',
    enum: VerificationStatus,
    default: VerificationStatus.UNVERIFIED,
  })
  verification_status: VerificationStatus;

  @Column({ type: 'numeric', precision: 3, scale: 2, nullable: true })
  confidence_score: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}

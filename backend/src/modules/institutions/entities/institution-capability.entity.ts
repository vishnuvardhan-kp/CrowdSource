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
import { InstitutionProfile } from './institution-profile.entity';
import { Capability } from '../../capabilities/entities/capability.entity';
import { Department } from './department.entity';
import { Laboratory } from './laboratory.entity';
import { CapabilitySource, VerificationStatus } from '../../../common/enums';

@Entity('institution_capabilities')
export class InstitutionCapability {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  institution_id: string;

  @ManyToOne(() => InstitutionProfile, (inst) => inst.capabilities, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'institution_id' })
  institution: InstitutionProfile;

  @Index()
  @Column({ type: 'uuid' })
  capability_id: string;

  @ManyToOne(() => Capability, (c) => c.institutionCapabilities, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'capability_id' })
  capability: Capability;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  department_id: string;

  @ManyToOne(() => Department, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  laboratory_id: string;

  @ManyToOne(() => Laboratory, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'laboratory_id' })
  laboratory: Laboratory;

  @Column({
    type: 'enum',
    enum: CapabilitySource,
    default: CapabilitySource.OFFICIAL_WEBSITE,
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
  evidence_summary: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}

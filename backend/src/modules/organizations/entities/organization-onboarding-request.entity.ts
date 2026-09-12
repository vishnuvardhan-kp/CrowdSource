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
import {
  OrganizationType,
  GeographicReach,
  ReviewStatus,
} from '../../../common/enums';
import { User } from '../../users/entities/user.entity';
import { Organization } from './organization.entity';

@Entity('organization_onboarding_requests')
export class OrganizationOnboardingRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  requester_user_id: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'requester_user_id' })
  requesterUser: User;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Index()
  @Column({
    type: 'enum',
    enum: OrganizationType,
    default: OrganizationType.OTHER,
  })
  organization_type: OrganizationType;

  @Column({ type: 'varchar', length: 100, nullable: true })
  registration_number: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  website: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Index()
  @Column({ type: 'varchar', length: 100 })
  district: string;

  @Column({ type: 'varchar', length: 100, default: 'Jharkhand' })
  state: string;

  @Column({
    type: 'enum',
    enum: GeographicReach,
    default: GeographicReach.DISTRICT,
  })
  geographic_reach: GeographicReach;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  verification_document_url: string;

  @Index()
  @Column({
    type: 'enum',
    enum: ReviewStatus,
    default: ReviewStatus.PENDING,
  })
  status: ReviewStatus;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  reviewed_by: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewed_by' })
  reviewer: User;

  @Column({ type: 'timestamptz', nullable: true })
  reviewed_at: Date;

  @Column({ type: 'text', nullable: true })
  admin_notes: string;

  @Column({ type: 'uuid', nullable: true })
  created_organization_id: string;

  @ManyToOne(() => Organization, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_organization_id' })
  createdOrganization: Organization;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}

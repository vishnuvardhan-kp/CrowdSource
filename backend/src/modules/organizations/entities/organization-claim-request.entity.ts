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
import { ClaimRequestStatus } from '../../../common/enums';
import { User } from '../../users/entities/user.entity';
import { Organization } from './organization.entity';

@Entity('organization_claim_requests')
export class OrganizationClaimRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  organization_id: string;

  @ManyToOne(() => Organization, (org) => org.claimRequests, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Index()
  @Column({ type: 'uuid' })
  requesting_user_id: string;

  @ManyToOne(() => User, (user) => user.claimRequests, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'requesting_user_id' })
  requestingUser: User;

  @Index()
  @Column({
    type: 'enum',
    enum: ClaimRequestStatus,
    default: ClaimRequestStatus.PENDING,
  })
  status: ClaimRequestStatus;

  @Column({ type: 'text' })
  reason: string;

  @CreateDateColumn({ type: 'timestamptz' })
  submitted_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  reviewed_at: Date;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  reviewed_by: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewed_by' })
  reviewer: User;

  @Column({ type: 'text', nullable: true })
  review_notes: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}

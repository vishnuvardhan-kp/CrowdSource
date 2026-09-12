import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
  OneToOne,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { OrganizationType, VerificationStatus, GeographicReach } from '../../../common/enums';
import { User } from '../../users/entities/user.entity';
import { District } from '../../locations/entities/district.entity';
import { InstitutionProfile } from '../../institutions/entities/institution-profile.entity';
import { IndustryProfile } from '../../industries/entities/industry-profile.entity';
import { OrganizationMembership } from './organization-membership.entity';
import { OrganizationClaimRequest } from './organization-claim-request.entity';
import { OrganizationEvidence } from './organization-evidence.entity';
import { TaxonomyAdditionRequest } from '../../capabilities/entities/taxonomy-addition-request.entity';
import { ExpressionOfInterest } from '../../eois/entities/expression-of-interest.entity';
import { ProjectParticipant } from '../../projects/entities/project-participant.entity';

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Index()
  @Column({
    type: 'enum',
    enum: OrganizationType,
    default: OrganizationType.OTHER,
  })
  organization_type: OrganizationType;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  website: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  district_id: string | null;

  @ManyToOne(() => District, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'district_id' })
  districtRef: District | null;

  @Index()
  @Column({ type: 'varchar', length: 100, nullable: true })
  district: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  state: string;

  @Index()
  @Column({
    type: 'enum',
    enum: GeographicReach,
    default: GeographicReach.DISTRICT,
  })
  geographic_reach: GeographicReach;

  @Column({ type: 'boolean', default: false })
  is_demo: boolean;

  @Column({ type: 'numeric', precision: 10, scale: 7, nullable: true })
  latitude: number;

  @Column({ type: 'numeric', precision: 10, scale: 7, nullable: true })
  longitude: number;

  @Index()
  @Column({
    type: 'enum',
    enum: VerificationStatus,
    default: VerificationStatus.UNVERIFIED,
  })
  verification_status: VerificationStatus;

  @Column({ type: 'varchar', length: 100, nullable: true })
  verification_source: string;

  @Column({ type: 'timestamptz', nullable: true })
  verified_at: Date;

  @Column({ type: 'uuid', nullable: true })
  verified_by: string;

  @Column({ type: 'boolean', default: false })
  is_claimed: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  claimed_at: Date;

  @Column({ type: 'int', default: 3 })
  available_capacity: number;

  @Column({ type: 'timestamptz', nullable: true })
  availability_confirmed_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  availability_expires_at: Date;

  @Column({ type: 'varchar', length: 20, default: 'UNKNOWN' })
  availability_status: string; // FRESH, STALE, UNKNOWN

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @OneToMany(() => User, (user) => user.organization)
  users: User[];

  @OneToOne(() => InstitutionProfile, (profile) => profile.organization)
  institutionProfile: InstitutionProfile;

  @OneToOne(() => IndustryProfile, (profile) => profile.organization)
  industryProfile: IndustryProfile;

  @OneToMany(() => OrganizationMembership, (m) => m.organization)
  memberships: OrganizationMembership[];

  @OneToMany(() => OrganizationClaimRequest, (c) => c.organization)
  claimRequests: OrganizationClaimRequest[];

  @OneToMany(() => OrganizationEvidence, (e) => e.organization)
  evidence: OrganizationEvidence[];

  @OneToMany(() => TaxonomyAdditionRequest, (t) => t.organization)
  taxonomyAdditionRequests: TaxonomyAdditionRequest[];

  @OneToMany(() => ExpressionOfInterest, (eoi) => eoi.organization)
  eois: ExpressionOfInterest[];

  @OneToMany(() => ProjectParticipant, (p) => p.organization)
  projectParticipations: ProjectParticipant[];
}

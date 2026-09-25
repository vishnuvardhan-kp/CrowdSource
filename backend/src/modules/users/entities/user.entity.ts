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
} from 'typeorm';
import { UserRole, JurisdictionScope } from '../../../common/enums';
import { Organization } from '../../organizations/entities/organization.entity';
import { OrganizationMembership } from '../../organizations/entities/organization-membership.entity';
import { OrganizationClaimRequest } from '../../organizations/entities/organization-claim-request.entity';
import { District } from '../../locations/entities/district.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255, nullable: true, select: false })
  password_hash: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.CITIZEN,
  })
  role: UserRole;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  organization_id: string;

  @ManyToOne(() => Organization, (org) => org.users, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  district_id: string | null;

  @ManyToOne(() => District, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'district_id' })
  districtRef: District | null;

  @Index()
  @Column({ type: 'varchar', length: 100, nullable: true })
  district: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, default: 'Jharkhand' })
  state: string;

  @Column({
    type: 'enum',
    enum: JurisdictionScope,
    nullable: true,
    default: JurisdictionScope.DISTRICT,
  })
  jurisdiction_scope: JurisdictionScope | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'varchar', length: 10, default: 'en' })
  preferred_language: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  department: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  designation: string | null;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  specializations: string[];

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @OneToMany(() => OrganizationMembership, (m) => m.user)
  memberships: OrganizationMembership[];

  @OneToMany(() => OrganizationClaimRequest, (c) => c.requestingUser)
  claimRequests: OrganizationClaimRequest[];
}

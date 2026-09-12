import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';
import { IndustryCapability } from './industry-capability.entity';

@Entity('industry_profiles')
export class IndustryProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'uuid', unique: true })
  organization_id: string;

  @OneToOne(() => Organization, (org) => org.industryProfile, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ type: 'varchar', length: 100, nullable: true })
  company_registration_number: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  industry_type: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  headquarters: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @OneToMany(() => IndustryCapability, (ic) => ic.industry)
  capabilities: IndustryCapability[];
}

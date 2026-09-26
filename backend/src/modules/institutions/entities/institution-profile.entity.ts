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
import { Department } from './department.entity';
import { ResearchArea } from './research-area.entity';
import { Laboratory } from './laboratory.entity';
import { Facility } from './facility.entity';
import { InstitutionCapability } from './institution-capability.entity';

@Entity('institution_profiles')
export class InstitutionProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'uuid', unique: true })
  organization_id: string;

  @OneToOne(() => Organization, (org) => org.institutionProfile, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 100, nullable: true, unique: true })
  institution_code: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  institution_category: string;

  @Column({ type: 'jsonb', nullable: true })
  accreditation_details: Record<string, any>;

  @Column({ type: 'int', nullable: true })
  established_year: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  campus_area: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @OneToMany(() => Department, (dept) => dept.institution)
  departments: Department[];

  @OneToMany(() => ResearchArea, (ra) => ra.institution)
  researchAreas: ResearchArea[];

  @OneToMany(() => Laboratory, (lab) => lab.institution)
  laboratories: Laboratory[];

  @OneToMany(() => Facility, (fac) => fac.institution)
  facilities: Facility[];

  @OneToMany(() => InstitutionCapability, (ic) => ic.institution)
  capabilities: InstitutionCapability[];
}

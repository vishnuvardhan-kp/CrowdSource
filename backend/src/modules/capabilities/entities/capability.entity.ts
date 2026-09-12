import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { InstitutionCapability } from '../../institutions/entities/institution-capability.entity';
import { IndustryCapability } from '../../industries/entities/industry-capability.entity';

@Entity('capabilities')
export class Capability {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 150, unique: true })
  name: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 150, unique: true })
  slug: string;

  @Index()
  @Column({ type: 'varchar', length: 100, default: 'General' })
  category: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @OneToMany(() => InstitutionCapability, (ic) => ic.capability)
  institutionCapabilities: InstitutionCapability[];

  @OneToMany(() => IndustryCapability, (ic) => ic.capability)
  industryCapabilities: IndustryCapability[];
}

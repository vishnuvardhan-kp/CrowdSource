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
import {
  InstitutionType,
  InstitutionSubtype,
  InstitutionStatus,
} from '../../../common/enums';
import { District } from '../../locations/entities/district.entity';
import { Block } from '../../locations/entities/block.entity';
import { InstitutionMembership } from './institution-membership.entity';

@Entity('institutions')
export class Institution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Index()
  @Column({ type: 'varchar', length: 255, nullable: true })
  name_local: string | null;

  @Index()
  @Column({
    type: 'enum',
    enum: InstitutionType,
  })
  type: InstitutionType;

  @Index()
  @Column({
    type: 'enum',
    enum: InstitutionSubtype,
  })
  subtype: InstitutionSubtype;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50, unique: true })
  lgd_code: string;

  @Index()
  @Column({ type: 'varchar', length: 100, default: 'Jharkhand' })
  state: string;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  district_id: string | null;

  @ManyToOne(() => District, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'district_id' })
  district: District | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  district_name: string | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  block_id: string | null;

  @ManyToOne(() => Block, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'block_id' })
  block: Block | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  block_name: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  pincode: string | null;

  @Column({
    type: 'enum',
    enum: InstitutionStatus,
    default: InstitutionStatus.ACTIVE,
  })
  status: InstitutionStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  contact_email: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  contact_phone: string | null;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ type: 'varchar', length: 50 })
  hierarchy_level: string;

  @Index()
  @Column({ type: 'varchar', length: 50, nullable: true })
  parent_lgd_code: string | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  parent_institution_id: string | null;

  @ManyToOne(() => Institution, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parent_institution_id' })
  parent_institution: Institution | null;

  @Index()
  @Column({ type: 'boolean', default: true })
  is_authoritative_lgd: boolean;

  @Column({ type: 'varchar', length: 20, default: '1' })
  lgd_version: string;

  @Column({ type: 'timestamptz', nullable: true })
  last_synced_at: Date | null;

  @Column({ type: 'jsonb', nullable: true, default: () => "'{}'::jsonb" })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @OneToMany(() => InstitutionMembership, (m) => m.institution)
  memberships: InstitutionMembership[];
}

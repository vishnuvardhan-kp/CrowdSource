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
import { FacultyMember } from './faculty-member.entity';

@Entity('research_areas')
export class ResearchArea {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  institution_id: string;

  @ManyToOne(() => InstitutionProfile, (inst) => inst.researchAreas, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'institution_id' })
  institution: InstitutionProfile;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  lead_faculty_id: string;

  @ManyToOne(() => FacultyMember, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'lead_faculty_id' })
  leadFaculty: FacultyMember;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('institution_audit_logs')
export class InstitutionAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 50 })
  entity_type: string;

  @Index()
  @Column({ type: 'uuid' })
  entity_id: string;

  @Index()
  @Column({ type: 'varchar', length: 50 })
  action: string;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  actor_id: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'actor_id' })
  actor: User | null;

  @Column({ type: 'jsonb', nullable: true })
  previous_state: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  new_state: Record<string, any> | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip_address: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}

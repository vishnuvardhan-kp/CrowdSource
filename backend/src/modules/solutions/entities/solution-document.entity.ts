import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SolutionDocumentType } from '../../../common/enums';
import { ProposedSolution } from './proposed-solution.entity';
import { User } from '../../users/entities/user.entity';

@Entity('solution_documents')
export class SolutionDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  solution_id: string;

  @ManyToOne(() => ProposedSolution, (s) => s.documents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'solution_id' })
  solution: ProposedSolution;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  uploaded_by: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'uploaded_by' })
  uploader: User | null;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({
    type: 'enum',
    enum: SolutionDocumentType,
    default: SolutionDocumentType.OTHER,
  })
  document_type: SolutionDocumentType;

  @Column({ type: 'varchar', length: 255 })
  storage_key: string;

  @Column({ type: 'varchar', length: 255 })
  file_name: string;

  @Column({ type: 'varchar', length: 100 })
  mime_type: string;

  @Column({ type: 'bigint' })
  file_size: number;

  @Column({ type: 'text', nullable: true })
  url: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { District } from './district.entity';

@Entity('blocks')
@Unique(['district_id', 'name'])
export class Block {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  district_id: string;

  @ManyToOne(() => District, (d) => d.blocks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'district_id' })
  district: District;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  code: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}

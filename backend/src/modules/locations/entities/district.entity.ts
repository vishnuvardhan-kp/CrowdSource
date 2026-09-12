import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Block } from './block.entity';

@Entity('districts')
export class District {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Index()
  @Column({ type: 'varchar', length: 100, default: 'Jharkhand' })
  state: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  code: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @OneToMany(() => Block, (b) => b.district)
  blocks: Block[];
}

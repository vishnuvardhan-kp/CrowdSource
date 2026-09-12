import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { EoiContributionType } from '../../../common/enums';
import { ExpressionOfInterest } from './expression-of-interest.entity';

@Entity('eoi_contributions')
export class EoiContribution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  eoi_id: string;

  @ManyToOne(() => ExpressionOfInterest, (eoi) => eoi.contributions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'eoi_id' })
  eoi: ExpressionOfInterest;

  @Column({
    type: 'enum',
    enum: EoiContributionType,
  })
  contribution_type: EoiContributionType;

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}

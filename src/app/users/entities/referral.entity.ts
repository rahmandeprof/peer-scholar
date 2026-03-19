import { User } from './user.entity';
import { IDAndTimestamp } from '@/database/entities/id-and-timestamp.entity';

import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

export enum ReferralStatus {
  PENDING = 'pending', // Referee signed up but not verified
  COMPLETED = 'completed', // Referee verified email, points awarded
  QUALIFIED = 'qualified', // Referee has started studying (used for leaderboard)
  DISQUALIFIED = 'disqualified', // Admin disqualified referral (fraud, abuse)
  EXPIRED = 'expired', // Referee never verified (optional cleanup)
}

@Entity('referral')
export class Referral extends IDAndTimestamp {
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'referrer_id' })
  referrer!: User;

  @Column({ name: 'referrer_id' })
  referrerId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'referee_id' })
  referee!: User;

  @Column({ name: 'referee_id' })
  refereeId!: string;

  @Column({
    name: 'status',
    type: 'varchar',
    default: ReferralStatus.PENDING,
  })
  status!: ReferralStatus;

  @Column({ name: 'points_awarded', type: 'int', default: 0 })
  pointsAwarded!: number;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt?: Date;

  @Column({ name: 'qualified_at', type: 'timestamp', nullable: true })
  qualifiedAt?: Date;

  @Column({ name: 'disqualified_at', type: 'timestamp', nullable: true })
  disqualifiedAt?: Date;

  @Column({ name: 'disqualification_reason', type: 'text', nullable: true })
  disqualificationReason?: string;
}

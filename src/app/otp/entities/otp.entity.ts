import { User } from '@/app/users/entities/user.entity';
import { IDAndTimestamp } from '@/database/entities/id-and-timestamp.entity';

import { OTPReason } from '@/types/otp';

import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

@Entity('otp')
export class OTP extends IDAndTimestamp {
  @Column({ name: 'reason', type: 'varchar' })
  reason!: OTPReason;

  @Column({ name: 'code' })
  code!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;
}

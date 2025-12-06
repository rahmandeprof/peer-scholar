import { User } from './user.entity';
import { IDAndTimestamp } from '@/database/entities/id-and-timestamp.entity';

import { Column, Entity, ManyToOne } from 'typeorm';

export enum PartnerRequestStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

@Entity()
export class PartnerRequest extends IDAndTimestamp {
  @ManyToOne(() => User, { eager: true })
  sender: User;

  @ManyToOne(() => User, { eager: true })
  receiver: User;

  @Column({
    type: 'varchar',
    default: PartnerRequestStatus.PENDING,
  })
  status: PartnerRequestStatus;

  @Column({ type: 'timestamp', nullable: true })
  lastNudgedAt: Date | null;
}

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
    type: 'simple-enum',
    enum: PartnerRequestStatus,
    default: PartnerRequestStatus.PENDING,
  })
  status: PartnerRequestStatus;

  @Column({ nullable: true })
  lastNudgedAt: Date | null;
}

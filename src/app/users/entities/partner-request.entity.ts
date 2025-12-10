import { User } from './user.entity';
import { IDAndTimestamp } from '@/database/entities/id-and-timestamp.entity';

import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

export enum PartnerRequestStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

@Entity('partner_request')
export class PartnerRequest extends IDAndTimestamp {
  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'sender_id' })
  sender: User;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'receiver_id' })
  receiver: User;

  @Column({
    name: 'status',
    type: 'varchar',
    default: PartnerRequestStatus.PENDING,
  })
  status: PartnerRequestStatus;

  @Column({ name: 'last_nudged_at', type: 'timestamp', nullable: true })
  lastNudgedAt: Date | null;
}

import { IDAndTimestamp } from '@/database/entities/id-and-timestamp.entity';

import { Column, Entity } from 'typeorm';

@Entity('verification')
export class Verification extends IDAndTimestamp {
  @Column({ name: 'identifier', type: String })
  identifier: string;

  @Column({ name: 'value', type: String })
  value: string;

  @Column({ name: 'expires_at', type: Date })
  expiresAt: Date;
}

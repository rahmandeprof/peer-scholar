import { User } from '@/app/users/entities/user.entity';
import { IDAndTimestamp } from '@/database/entities/id-and-timestamp.entity';

import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

@Entity('session')
export class Session extends IDAndTimestamp {
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId!: string;

  @Column({ name: 'token', type: String })
  token!: string;

  @Column({ name: 'expires_at', type: Date })
  expiresAt!: Date;

  @Column({ name: 'ip_address', type: String, nullable: true })
  ipAddress!: string | null;

  @Column({ name: 'user_agent', type: String, nullable: true })
  userAgent!: string | null;

  @Column({ name: 'impersonated_by', type: String, nullable: true })
  impersonatedBy!: string | null;
}

import { User } from '@/app/users/entities/user.entity';
import { IDAndTimestamp } from '@/database/entities/id-and-timestamp.entity';

import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

@Entity('account')
export class Account extends IDAndTimestamp {
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'account_id', type: String })
  accountId: string;

  @Column({ name: 'provider_id', type: String })
  providerId: string;

  @Column({ name: 'access_token', type: String, nullable: true })
  accessToken: string | null;

  @Column({ name: 'refresh_token', type: String, nullable: true })
  refreshToken: string | null;

  @Column({ name: 'access_token_expires_at', type: Date, nullable: true })
  accessTokenExpiresAt: Date | null;

  @Column({ name: 'refresh_token_expires_at', type: Date, nullable: true })
  refreshTokenExpiresAt: Date | null;

  @Column({ name: 'scope', type: String, nullable: true })
  scope: string | null;

  @Column({ name: 'id_token', type: String, nullable: true })
  idToken: string | null;

  @Column({ name: 'password', type: String, nullable: true })
  password: string | null;
}

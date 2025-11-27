import { User } from '@/app/users/entities/user.entity';
import { IDAndTimestamp } from '@/database/entities/id-and-timestamp.entity';

import { Column, Entity, ManyToOne } from 'typeorm';

@Entity()
export class Conversation extends IDAndTimestamp {
  @Column()
  title!: string;

  @ManyToOne(() => User)
  user!: User;

  @Column()
  userId!: string;
}

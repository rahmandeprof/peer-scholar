import { Conversation } from './conversation.entity';
import { IDAndTimestamp } from '@/database/entities/id-and-timestamp.entity';

import { Column, Entity, ManyToOne } from 'typeorm';

export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
}

@Entity()
export class Message extends IDAndTimestamp {
  @Column({ type: 'text' })
  content!: string;

  @Column({
    type: 'varchar',
  })
  role!: MessageRole;

  @ManyToOne(() => Conversation, { onDelete: 'CASCADE' })
  conversation!: Conversation;

  @Column()
  conversationId!: string;
}

import { Conversation } from './conversation.entity';
import { IDAndTimestamp } from '@/database/entities/id-and-timestamp.entity';

import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
}

@Entity('message')
export class Message extends IDAndTimestamp {
  @Column({ name: 'content', type: 'text' })
  content!: string;

  @Column({
    name: 'role',
    type: 'varchar',
  })
  role!: MessageRole;

  @ManyToOne(() => Conversation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation!: Conversation;

  @Column({ name: 'conversation_id' })
  conversationId!: string;
}

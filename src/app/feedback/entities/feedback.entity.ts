import { User } from '@/app/users/entities/user.entity';

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('feedbacks')
export class Feedback {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  message: string;

  @Column()
  userEmail: string;

  @Column({ nullable: true })
  userName: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ default: false })
  isRead: boolean;

  @CreateDateColumn()
  createdAt: Date;
}

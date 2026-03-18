import { Material } from './material.entity';
import { User } from '@/app/users/entities/user.entity';

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
@Index(['userId', 'materialId']) // Use column names, not relation names
export class PageBookmark {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  materialId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Material, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'material_id' })
  material: Material;

  @Column()
  pageNumber: number;

  @Column({ nullable: true, length: 100 })
  note: string; // Optional label/note for the bookmark

  @CreateDateColumn()
  createdAt: Date;
}

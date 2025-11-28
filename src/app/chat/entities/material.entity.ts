import { User } from '@/app/users/entities/user.entity';
import { IDAndTimestamp } from '@/database/entities/id-and-timestamp.entity';

import { Column, Entity, ManyToOne } from 'typeorm';

export enum MaterialCategory {
  COURSE_MATERIAL = 'course_material',
  PAST_QUESTION = 'past_question',
  PERSONAL_NOTE = 'personal_note',
}

@Entity()
export class Material extends IDAndTimestamp {
  @Column()
  title!: string;

  @Column()
  url!: string;

  @Column()
  type!: string;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'text', nullable: true })
  summary: string;

  @Column({ nullable: true })
  department!: string;

  @Column({ type: 'int', nullable: true })
  yearLevel!: number;

  @Column({ nullable: true })
  courseCode: string;

  @Column({ nullable: true })
  topic: string;

  @Column({
    type: 'simple-enum',
    enum: MaterialCategory,
    default: MaterialCategory.COURSE_MATERIAL,
  })
  category!: MaterialCategory;

  @Column({ default: false })
  isPublic!: boolean;

  @ManyToOne(() => User, { nullable: true })
  uploadedBy!: User;
}

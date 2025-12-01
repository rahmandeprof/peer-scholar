import { MaterialChunk } from './material-chunk.entity';
import { Course } from '@/app/academic/entities/course.entity';
import { User } from '@/app/users/entities/user.entity';
import { IDAndTimestamp } from '@/database/entities/id-and-timestamp.entity';

import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';

export enum MaterialType {
  NOTE = 'note',
  SLIDE = 'slide',
  PAST_QUESTION = 'past_question',
  OTHER = 'other',
}

export enum AccessScope {
  PUBLIC = 'public',
  DEPARTMENT = 'department',
  COURSE = 'course',
  PRIVATE = 'private',
}

export enum MaterialStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  READY = 'ready',
  FAILED = 'failed',
}

@Entity()
export class Material extends IDAndTimestamp {
  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: MaterialType,
    default: MaterialType.OTHER,
  })
  type: MaterialType;

  @Column({ type: 'text', nullable: true })
  content?: string;

  @Column({ type: 'text', nullable: true })
  summary?: string;

  @Column()
  fileUrl: string;

  @Column({ nullable: true })
  fileType: string;

  @Column({ type: 'int', default: 0 })
  size: number;

  @ManyToOne(() => Course, (course) => course.materials, { nullable: true })
  course?: Course;

  @ManyToOne(() => User, (user) => user.materials)
  uploader: User;

  @Column({
    type: 'enum',
    enum: AccessScope,
    default: AccessScope.PRIVATE,
  })
  scope: AccessScope;

  @Column({
    type: 'enum',
    enum: MaterialStatus,
    default: MaterialStatus.PENDING,
  })
  status: MaterialStatus;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  @Column({ type: 'int', default: 0 })
  views: number;

  @Column({ type: 'int', default: 0 })
  downloads: number;

  @OneToMany(() => MaterialChunk, (chunk) => chunk.material)
  chunks: MaterialChunk[];
}

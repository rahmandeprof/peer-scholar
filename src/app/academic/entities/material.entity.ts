import { MaterialChunk } from './material-chunk.entity';
import { MaterialFavorite } from './material-favorite.entity';
import { MaterialRating } from './material-rating.entity';
import { Course } from '@/app/academic/entities/course.entity';
import { User } from '@/app/users/entities/user.entity';
import { IDAndTimestamp } from '@/database/entities/id-and-timestamp.entity';

import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
} from 'typeorm';

export enum MaterialType {
  NOTE = 'note',
  SLIDE = 'slide',
  PAST_QUESTION = 'past_question',
  OTHER = 'other',
}

export enum AccessScope {
  PUBLIC = 'public',
  FACULTY = 'faculty',
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

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
}

@Entity()
export class Material extends IDAndTimestamp {
  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column({
    type: 'varchar',
    default: MaterialType.OTHER,
  })
  type: MaterialType;

  @Column({ type: 'text', nullable: true })
  content?: string;

  @Column({ type: 'text', nullable: true })
  summary?: string;

  @Column({ type: 'simple-array', nullable: true })
  keyPoints?: string[];

  @Column({ type: 'json', nullable: true })
  quiz?: QuizQuestion[];

  @Column({ type: 'json', nullable: true })
  flashcards?: { term: string; definition: string }[];

  @Column({ nullable: true })
  fileUrl: string;

  @Column({ nullable: true })
  pdfUrl: string;

  @Column({ nullable: true })
  fileType: string;

  @Column({ type: 'int', default: 0 })
  size: number;

  @ManyToOne(() => Course, (course) => course.materials, { nullable: true })
  course?: Course;

  @ManyToOne(() => User, (user) => user.materials)
  uploader: User;

  @Column({
    type: 'varchar',
    default: AccessScope.PRIVATE,
  })
  scope: AccessScope;

  @Column({
    type: 'varchar',
    default: MaterialStatus.PENDING,
  })
  status: MaterialStatus;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  @Column({ type: 'int', default: 0 })
  views: number;

  @Column({ type: 'int', default: 0 })
  downloads: number;

  @Column({ nullable: true })
  targetFaculty?: string;

  @Column({ nullable: true })
  targetDepartment?: string;

  @Column({ nullable: true })
  courseCode?: string;

  @Column({ nullable: true })
  topic?: string;

  @Column({ type: 'int', nullable: true })
  targetYear?: number;

  @OneToMany(() => MaterialChunk, (chunk) => chunk.material)
  chunks: MaterialChunk[];

  @OneToMany(() => MaterialRating, (rating) => rating.material)
  ratings: MaterialRating[];

  @OneToMany(() => MaterialFavorite, (fav) => fav.material)
  favorites: MaterialFavorite[];

  @Column({ type: 'float', default: 0 })
  averageRating: number;

  @Column({ type: 'int', default: 0 })
  favoritesCount: number;

  @Column({ nullable: true })
  fileHash: string;

  @ManyToOne(() => Material, (material) => material.versions, {
    nullable: true,
  })
  parent?: Material;

  @OneToMany(() => Material, (material) => material.parent)
  versions: Material[];

  @ManyToMany(() => User)
  @JoinTable()
  contributors: User[];
}

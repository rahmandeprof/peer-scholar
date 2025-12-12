import { MaterialChunk } from './material-chunk.entity';
import { MaterialFavorite } from './material-favorite.entity';
import { MaterialRating } from './material-rating.entity';
import { Course } from '@/app/academic/entities/course.entity';
import { PersonalCourse } from '@/app/academic/entities/personal-course.entity';
import { User } from '@/app/users/entities/user.entity';
import { IDAndTimestamp } from '@/database/entities/id-and-timestamp.entity';

import {
  Column,
  Entity,
  JoinColumn,
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

// Support both old format (correctAnswer) and new format (answer, id, type, hint)
export interface QuizQuestion {
  id?: string;
  type?: string;
  question: string;
  options: string[];
  correctAnswer?: string;  // Old format
  answer?: string;         // New format
  explanation?: string;
  hint?: string;
}

// Support both old format (term/definition) and new format (id/front/back)
export interface FlashcardItem {
  id?: string;
  term?: string;       // Old format
  definition?: string; // Old format
  front?: string;      // New format
  back?: string;       // New format
}

@Entity('material')
export class Material extends IDAndTimestamp {
  @Column({ name: 'title' })
  title: string;

  @Column({ name: 'description', nullable: true })
  description: string;

  @Column({
    name: 'type',
    type: 'varchar',
    default: MaterialType.OTHER,
  })
  type: MaterialType;

  @Column({ name: 'content', type: 'text', nullable: true })
  content?: string;

  @Column({ name: 'summary', type: 'text', nullable: true })
  summary?: string;

  @Column({ name: 'key_points', type: 'simple-array', nullable: true })
  keyPoints?: string[];

  @Column({ name: 'quiz', type: 'json', nullable: true })
  quiz?: QuizQuestion[];

  @Column({ name: 'flashcards', type: 'json', nullable: true })
  flashcards?: FlashcardItem[];

  @Column({ name: 'file_url', nullable: true })
  fileUrl: string;

  @Column({ name: 'pdf_url', nullable: true })
  pdfUrl: string;

  @Column({ name: 'file_type', nullable: true })
  fileType: string;

  @Column({ name: 'size', type: 'int', default: 0 })
  size: number;

  @ManyToOne(() => Course, (course) => course.materials, { nullable: true })
  @JoinColumn({ name: 'course_id' })
  course?: Course;

  @ManyToOne(() => User, (user) => user.materials)
  @JoinColumn({ name: 'uploader_id' })
  uploader: User;

  @Column({
    name: 'scope',
    type: 'varchar',
    default: AccessScope.PRIVATE,
  })
  scope: AccessScope;

  @Column({
    name: 'status',
    type: 'varchar',
    default: MaterialStatus.PENDING,
  })
  status: MaterialStatus;

  @Column({ name: 'tags', type: 'simple-array', nullable: true })
  tags: string[];

  @Column({ name: 'views', type: 'int', default: 0 })
  views: number;

  @Column({ name: 'downloads', type: 'int', default: 0 })
  downloads: number;

  @Column({ name: 'target_faculty', nullable: true })
  targetFaculty?: string;

  @Column({ name: 'target_department', nullable: true })
  targetDepartment?: string;

  @Column({ name: 'course_code', nullable: true })
  courseCode?: string;

  @Column({ name: 'topic', nullable: true })
  topic?: string;

  @Column({ name: 'target_year', type: 'int', nullable: true })
  targetYear?: number;

  @OneToMany(() => MaterialChunk, (chunk) => chunk.material)
  chunks: MaterialChunk[];

  @OneToMany(() => MaterialRating, (rating) => rating.material)
  ratings: MaterialRating[];

  @OneToMany(() => MaterialFavorite, (fav) => fav.material)
  favorites: MaterialFavorite[];

  @Column({ name: 'average_rating', type: 'float', default: 0 })
  averageRating: number;

  @Column({ name: 'favorites_count', type: 'int', default: 0 })
  favoritesCount: number;

  @Column({ name: 'flag_count', type: 'int', default: 0 })
  flagCount: number;

  @Column({ name: 'is_hidden', default: false })
  isHidden: boolean;

  @ManyToMany(() => PersonalCourse, (course) => course.materials)
  personalCourses: PersonalCourse[];

  @Column({ name: 'file_hash', nullable: true })
  fileHash: string;

  @ManyToOne(() => Material, (material) => material.versions, {
    nullable: true,
  })
  @JoinColumn({ name: 'parent_id' })
  parent?: Material;

  @OneToMany(() => Material, (material) => material.parent)
  versions: Material[];

  @ManyToMany(() => User)
  @JoinTable({
    name: 'material_contributors',
    joinColumn: { name: 'material_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' },
  })
  contributors: User[];
}

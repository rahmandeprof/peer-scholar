import { DocumentSegment } from './document-segment.entity';
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

// Processing status for document segmentation pipeline
export enum ProcessingStatus {
  PENDING = 'pending',
  EXTRACTING = 'extracting',
  OCR_EXTRACTING = 'ocr_extracting', // OCR fallback for scanned PDFs
  CLEANING = 'cleaning',
  SEGMENTING = 'segmenting',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

// Processing version - V1 = legacy content-based, V2 = segment-based
export enum ProcessingVersion {
  V1 = 'v1',  // Legacy - uses content field only
  V2 = 'v2',  // Modern - uses DocumentSegments
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

  @OneToMany(() => DocumentSegment, (segment) => segment.material)
  segments: DocumentSegment[];

  @Column({
    name: 'processing_status',
    type: 'varchar',
    default: ProcessingStatus.PENDING,
  })
  processingStatus: ProcessingStatus;

  @Column({ name: 'material_version', type: 'int', default: 1 })
  materialVersion: number;

  @Column({ name: 'quiz_generated_version', type: 'int', nullable: true })
  quizGeneratedVersion?: number;

  @Column({ name: 'flashcard_generated_version', type: 'int', nullable: true })
  flashcardGeneratedVersion?: number;

  // Processing version for lazy migration (v1 = legacy, v2 = segment-based)
  @Column({
    name: 'processing_version',
    type: 'varchar',
    default: ProcessingVersion.V1,
  })
  processingVersion: ProcessingVersion;

  // Flag for content generated using legacy flow
  @Column({ name: 'legacy_generated', type: 'boolean', default: false })
  legacyGenerated: boolean;

  // OCR processing tracking
  @Column({ name: 'is_ocr_processed', type: 'boolean', default: false })
  isOcrProcessed: boolean;

  @Column({ name: 'ocr_confidence', type: 'float', nullable: true })
  ocrConfidence?: number;

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

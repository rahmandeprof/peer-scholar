/* eslint-disable @typescript-eslint/no-unnecessary-condition */

/* eslint-disable @typescript-eslint/no-misused-spread */
import { InjectQueue } from '@nestjs/bull';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';

import { Department } from './entities/department.entity';
import {
  AccessScope,
  Material,
  MaterialStatus,
  ProcessingStatus,
} from './entities/material.entity';
import { MaterialAnnotation } from './entities/material-annotation.entity';
import { MaterialFavorite } from './entities/material-favorite.entity';
import {
  FlagReason,
  FlagStatus,
  MaterialFlag,
} from './entities/material-flag.entity';
import { MaterialRating } from './entities/material-rating.entity';
import { MaterialReport } from './entities/material-report.entity';
import { Note } from './entities/note.entity';
import { PageBookmark } from './entities/page-bookmark.entity';
import { PublicNote, PublicNoteVote } from './entities/public-note.entity';
import { Course } from '@/app/academic/entities/course.entity';
import { User } from '@/app/users/entities/user.entity';
import { ViewingHistory } from '@/app/users/entities/viewing-history.entity';

import { CreateMaterialDto } from './dto/create-material.dto';

import { ConversionService } from '@/app/common/services/conversion.service';
import { R2Service } from '@/app/common/services/r2.service';
import { UsersService } from '@/app/users/users.service';

import axios from 'axios';
import { Queue } from 'bull';
import { v2 as cloudinary } from 'cloudinary';
import { Brackets, Repository, WhereExpressionBuilder } from 'typeorm';

@Injectable()
export class MaterialsService {
  private readonly storageProvider: 'r2' | 'cloudinary';
  constructor(
    @InjectRepository(Material)
    private materialRepo: Repository<Material>,
    @InjectRepository(Course)
    private courseRepo: Repository<Course>,
    private configService: ConfigService,
    @InjectQueue('materials') private materialsQueue: Queue,
    private usersService: UsersService,
    private conversionService: ConversionService,
    private r2Service: R2Service,
    @InjectRepository(MaterialRating)
    private ratingRepo: Repository<MaterialRating>,
    @InjectRepository(MaterialFavorite)
    private favoriteRepo: Repository<MaterialFavorite>,
    @InjectRepository(MaterialAnnotation)
    private annotationRepo: Repository<MaterialAnnotation>,
    @InjectRepository(MaterialReport)
    private reportRepo: Repository<MaterialReport>,
    @InjectRepository(Note)
    private noteRepo: Repository<Note>,
    @InjectRepository(PublicNote)
    private publicNoteRepo: Repository<PublicNote>,
    @InjectRepository(PublicNoteVote)
    private publicNoteVoteRepo: Repository<PublicNoteVote>,
    @InjectRepository(MaterialFlag)
    private flagRepo: Repository<MaterialFlag>,
    @InjectRepository(PageBookmark)
    private bookmarkRepo: Repository<PageBookmark>,
    @InjectRepository(ViewingHistory)
    private viewingHistoryRepo: Repository<ViewingHistory>,
  ) {
    cloudinary.config({
      cloud_name: this.configService.get('CLOUD_NAME'),
      api_key: this.configService.get('CLOUD_API_KEY'),
      api_secret: this.configService.get('CLOUD_API_SECRET'),
    });

    // Determine storage provider
    const configuredProvider =
      this.configService.get<string>('STORAGE_PROVIDER');

    this.storageProvider =
      configuredProvider === 'r2' && this.r2Service.isConfigured()
        ? 'r2'
        : 'cloudinary';
  }

  // ... (existing getPresignedUrl)

  /**
   * Get processing status for multiple materials at once
   * Used for polling to detect when processing completes
   */
  async getBatchStatus(materialIds: string[]) {
    if (materialIds.length === 0) return [];

    const materials = await this.materialRepo
      .createQueryBuilder('material')
      .select(['material.id', 'material.processingStatus', 'material.status'])
      .whereInIds(materialIds)
      .getMany();

    return materials.map((m) => ({
      id: m.id,
      processingStatus: m.processingStatus,
      status: m.status,
    }));
  }

  async create(dto: CreateMaterialDto, user: User) {
    const material = this.materialRepo.create({
      title: dto.title,
      description: dto.description,
      type: dto.type,
      fileUrl: dto.fileUrl,
      fileType: dto.fileType,
      size: dto.size,
      scope: dto.scope,
      tags: dto.tags,
      course: undefined,
      courseCode: dto.courseCode,
      targetFaculty: dto.targetFaculty,
      targetDepartment: dto.targetDepartment,
      topic: dto.topic,
      targetYear: dto.targetYear,
      uploader: user,
      schoolId: user.schoolId, // Auto-assign from uploader for multi-university scoping
      status: MaterialStatus.PENDING,
      processingStatus: ProcessingStatus.PENDING,
      fileHash: dto.fileHash,
      parent: dto.parentMaterialId
        ? ({ id: dto.parentMaterialId } as Material)
        : undefined,
    });

    const savedMaterial = await this.materialRepo.save(material);

    // Queue background processing for text extraction and segmentation
    await this.materialsQueue.add('process-material', {
      materialId: savedMaterial.id,
      fileUrl: savedMaterial.fileUrl,
    });

    // Reward user for uploading
    await this.usersService.increaseReputation(user.id, 10);

    return savedMaterial;
  }

  // ... (existing methods)

  /**
   * Get presigned URL for direct upload
   * Returns provider-aware response with optional fallback for Cloudinary
   */
  async getPresignedUrl(fileType: string, filename?: string) {
    const MAX_CLOUDINARY_SIZE = 9.5 * 1024 * 1024; // 9.5MB (buffer for 10MB limit)

    // Primary: R2 if configured
    if (this.storageProvider === 'r2') {
      const r2Presign = await this.r2Service.getPresignedUploadUrl(
        fileType,
        filename,
      );

      // Also include Cloudinary fallback for files < 10MB
      const cloudinaryFallback = this.getCloudinaryPresign();

      return {
        provider: 'r2' as const,
        primary: {
          url: r2Presign.uploadUrl,
          publicUrl: r2Presign.publicUrl,
          key: r2Presign.key,
          method: 'PUT',
          headers: {
            'Content-Type': fileType,
          },
        },
        fallback: {
          provider: 'cloudinary' as const,
          maxSize: MAX_CLOUDINARY_SIZE,
          ...cloudinaryFallback,
        },
      };
    }

    // Default: Cloudinary only
    const cloudinaryPresign = this.getCloudinaryPresign();

    return {
      provider: 'cloudinary' as const,
      primary: cloudinaryPresign,
      fallback: null,
    };
  }

  /**
   * Get Cloudinary presigned URL (legacy method, now private)
   */
  private getCloudinaryPresign() {
    const timestamp = Math.floor(new Date().getTime() / 1000);
    const folder = 'materials';
    const resourceType = 'auto';

    const params = {
      timestamp,
      folder,
      upload_preset: 'ml_default',
      unique_filename: true,
      overwrite: true,
    };

    const apiSecret = this.configService.get<string>('CLOUD_API_SECRET') ?? '';
    const cloudName = this.configService.get<string>('CLOUD_NAME') ?? '';

    const signature = cloudinary.utils.api_sign_request(params, apiSecret);

    return {
      url: `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
      signature,
      uploadTimestamp: timestamp,
      apiKey: this.configService.get('CLOUD_API_KEY'),
      folder,
      uploadPreset: 'ml_default',
      uniqueFilename: true,
      overwrite: true,
      method: 'POST' as const,
    };
  }

  async getTrending(user: User) {
    const query = this.materialRepo
      .createQueryBuilder('material')
      .leftJoinAndSelect('material.uploader', 'uploader');

    // Admin bypass - skip all scope filtering, include hidden materials
    const isAdmin = user.role === 'admin';

    // Non-admin users should not see hidden materials
    if (!isAdmin) {
      query.andWhere('material.isHidden = :isHidden', { isHidden: false });

      // Multi-university scoping: only show materials from user's university
      if (user.schoolId) {
        query.andWhere('material.school_id = :schoolId', {
          schoolId: user.schoolId,
        });
      }
    }

    // Admin sees all materials, non-admin sees scoped materials
    if (!isAdmin) {
      query.andWhere(
        new Brackets((qb: WhereExpressionBuilder) => {
          qb.where('material.scope = :publicScope', {
            publicScope: AccessScope.PUBLIC,
          }).orWhere('uploader.id = :userId', { userId: user.id });

          if (user.department) {
            const userDeptName =
              typeof user.department === 'string'
                ? user.department
                : (user.department as { name: string }).name;

            qb.orWhere(
              '(material.scope = :deptScope AND material.targetDepartment = :userDeptName)',
              {
                deptScope: AccessScope.DEPARTMENT,
                userDeptName,
              },
            );
          }

          if (user.faculty) {
            const userFacultyName =
              typeof user.faculty === 'string'
                ? user.faculty
                : (user.faculty as { name: string }).name;

            qb.orWhere(
              '(material.scope = :facultyScope AND material.targetFaculty = :userFacultyName)',
              {
                facultyScope: AccessScope.FACULTY,
                userFacultyName,
              },
            );
          }
        }),
      );
    }

    return query
      .orderBy('material.views', 'DESC')
      .addOrderBy('material.createdAt', 'DESC')
      .take(5)
      .getMany();
  }

  async getCourseTopics(courseId: string) {
    const course = await this.courseRepo.findOneBy({ id: courseId });

    if (!course) return [];

    const materials = await this.materialRepo.find({
      where: { courseCode: course.code },
      select: ['tags'],
    });

    const topicCounts: Record<string, number> = {};

    materials.forEach((material) => {
      material.tags.forEach((tag) => {
        const normalizedTag = tag.trim().toLowerCase();

        if (normalizedTag) {
          topicCounts[normalizedTag] = (topicCounts[normalizedTag] || 0) + 1;
        }
      });
    });

    return Object.entries(topicCounts)
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  async findAll(
    user: User,
    courseId?: string,
    type?: string,
    search?: string,
    page = 1,
    limit = 12,
    sortBy = 'createdAt',
    order: 'ASC' | 'DESC' = 'DESC',
  ) {
    const query = this.materialRepo
      .createQueryBuilder('material')
      .leftJoinAndSelect('material.uploader', 'uploader');

    // Admin bypass - skip all scope filtering, include hidden materials
    const isAdmin = user.role === 'admin';

    // Non-admin users should not see hidden materials
    if (!isAdmin) {
      query.andWhere('material.isHidden = :isHidden', { isHidden: false });

      // Multi-university scoping: only show materials from user's university
      if (user.schoolId) {
        query.andWhere('material.school_id = :schoolId', {
          schoolId: user.schoolId,
        });
      }
    }

    if (courseId) {
      const course = await this.courseRepo.findOneBy({ id: courseId });

      if (course) {
        query.andWhere('material.courseCode = :courseCode', {
          courseCode: course.code,
        });
      } else {
        query.andWhere('1 = 0');
      }
    }

    // Admin sees all years, non-admin sees their year only
    if (!isAdmin && user.yearOfStudy) {
      query.andWhere(
        '(material.targetYear IS NULL OR material.targetYear = :year)',
        { year: user.yearOfStudy },
      );
    }

    if (type && type !== 'all') {
      query.andWhere('material.type = :type', { type });
    }

    if (search) {
      query.andWhere(
        '(LOWER(material.title) LIKE LOWER(:search) OR LOWER(material.description) LIKE LOWER(:search))',
        { search: `%${search}%` },
      );
    }

    // Admin sees all materials, non-admin sees scoped materials
    if (!isAdmin) {
      query.andWhere(
        new Brackets((qb: WhereExpressionBuilder) => {
          qb.where('material.scope = :publicScope', {
            publicScope: AccessScope.PUBLIC,
          }).orWhere('uploader.id = :userId', { userId: user.id });

          if (user.department) {
            const userDeptName =
              typeof user.department === 'string'
                ? user.department
                : (user.department as { name: string }).name;

            qb.orWhere(
              '(material.scope = :deptScope AND material.targetDepartment = :userDeptName)',
              {
                deptScope: AccessScope.DEPARTMENT,
                userDeptName,
              },
            );
          }

          if (user.faculty) {
            const userFacultyName =
              typeof user.faculty === 'string'
                ? user.faculty
                : (user.faculty as { name: string }).name;

            qb.orWhere(
              '(material.scope = :facultyScope AND material.targetFaculty = :userFacultyName)',
              {
                facultyScope: AccessScope.FACULTY,
                userFacultyName,
              },
            );
          }
        }),
      );
    }

    // Add ordering for consistent pagination
    const allowedSortFields = [
      'createdAt',
      'favoritesCount',
      'views',
      'averageRating',
    ];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortOrder = order === 'ASC' ? 'ASC' : 'DESC';

    query.orderBy(`material.${sortField}`, sortOrder);

    // Get total count before pagination
    const total = await query.getCount();

    // Apply pagination
    const skip = (page - 1) * limit;

    query.skip(skip).take(limit);

    const materials = await query.getMany();

    return {
      materials,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateScope(id: string, scope: AccessScope, userId: string) {
    const material = await this.findOne(id);

    if (material.uploader.id !== userId) {
      throw new ForbiddenException('Only the uploader can update the scope');
    }
    if (material.content) {
      return { content: material.content };
    }

    try {
      const response = await axios.get(material.fileUrl, {
        responseType: 'arraybuffer',
      });
      const buffer = Buffer.from(response.data);

      const text = await this.conversionService.extractText(
        buffer,
        material.fileType,
        material.title,
      );

      if (text) {
        material.content = text;
        await this.materialRepo.save(material);
      }

      return { content: text };
    } catch {
      // console.error('Failed to extract text on demand', error);
      throw new BadRequestException('Failed to extract text from file');
    }
  }

  async findOne(id: string, userId?: string) {
    const material = await this.materialRepo.findOne({
      where: { id },
      relations: [
        'uploader',
        'course',
        'versions',
        'versions.uploader',
        'parent',
        'contributors',
      ],
    });

    if (!material) {
      throw new NotFoundException('Material not found');
    }

    let isFavorited = false;

    if (userId) {
      const fav = await this.favoriteRepo.findOne({
        where: { material: { id }, user: { id: userId } },
      });

      isFavorited = !!fav;
    }

    return Object.assign({}, material, { isFavorited });
  }

  /**
   * Get material with full interaction data (for batched endpoint)
   * Combines material data + isFavorited + userRating in one call
   */
  async findOneFull(id: string, userId: string) {
    const material = await this.materialRepo.findOne({
      where: { id },
      relations: [
        'uploader',
        'course',
        'versions',
        'versions.uploader',
        'parent',
        'contributors',
      ],
    });

    if (!material) {
      throw new NotFoundException('Material not found');
    }

    // Fetch favorite and rating in parallel
    const [fav, rating] = await Promise.all([
      this.favoriteRepo.findOne({
        where: { material: { id }, user: { id: userId } },
      }),
      this.ratingRepo.findOne({
        where: { material: { id }, user: { id: userId } },
      }),
    ]);

    return {
      ...material,
      isFavorited: !!fav,
      userRating: rating?.value ?? 0,
    };
  }

  async getFavoritesCount(userId: string) {
    const count = await this.favoriteRepo.count({
      where: { user: { id: userId } },
    });

    return { count };
  }

  async getFavorites(userId: string) {
    const favorites = await this.favoriteRepo.find({
      where: { user: { id: userId } },
      relations: ['material', 'material.uploader'],
      order: { createdAt: 'DESC' },
    });

    return favorites.map((fav) => ({
      ...fav.material,
      isFavorited: true,
    }));
  }

  async extractText(id: string) {
    const material = await this.materialRepo.findOneBy({ id }); // Direct repo call to get Entity

    if (!material) throw new NotFoundException('Material not found');

    if (material.content) {
      return { content: material.content };
    }

    try {
      const response = await axios.get(material.fileUrl, {
        responseType: 'arraybuffer',
      });
      const buffer = Buffer.from(response.data);

      const text = await this.conversionService.extractText(
        buffer,
        material.fileType,
        material.title,
      );

      if (text) {
        await this.materialRepo.update(id, { content: text });
      }

      return { content: text };
    } catch {
      // console.error('Extraction failed', error);
      throw new BadRequestException('Failed to extract text from file');
    }
  }

  async toggleFavorite(materialId: string, userId: string) {
    const existing = await this.favoriteRepo.findOne({
      where: { material: { id: materialId }, user: { id: userId } },
    });

    const material = await this.materialRepo.findOneBy({ id: materialId });

    if (!material) throw new NotFoundException('Material not found');

    if (existing) {
      await this.favoriteRepo.remove(existing);
      material.favoritesCount = Math.max(0, material.favoritesCount - 1);
    } else {
      const favorite = this.favoriteRepo.create({
        material: { id: materialId },
        user: { id: userId },
      });

      await this.favoriteRepo.save(favorite);
      material.favoritesCount += 1;
    }

    await this.materialRepo.save(material);

    return { isFavorited: !existing, favoritesCount: material.favoritesCount };
  }

  async rateMaterial(materialId: string, userId: string, value: number) {
    if (value < 1 || value > 5)
      throw new BadRequestException('Rating must be between 1 and 5');

    let rating = await this.ratingRepo.findOne({
      where: { material: { id: materialId }, user: { id: userId } },
    });

    if (rating) {
      rating.value = value;
    } else {
      rating = this.ratingRepo.create({
        material: { id: materialId },
        user: { id: userId },
        value,
      });
    }

    await this.ratingRepo.save(rating);

    // Recalculate average
    const { avg } = await this.ratingRepo
      .createQueryBuilder('rating')
      .select('AVG(rating.value)', 'avg')
      .where('rating.materialId = :materialId', { materialId })
      .getRawOne();

    const material = await this.materialRepo.findOneBy({ id: materialId });

    if (material) {
      material.averageRating = parseFloat(Number(avg).toFixed(1));
      await this.materialRepo.save(material);
    }

    return { averageRating: material?.averageRating, userRating: value };
  }

  async checkDuplicate(hash: string, department?: string) {
    if (!hash) return null;

    const query = this.materialRepo
      .createQueryBuilder('material')
      .where('material.fileHash = :hash', { hash })
      .leftJoinAndSelect('material.uploader', 'uploader');

    if (department) {
      // Optional: restrict duplicate check to same department if needed
      // query.andWhere('material.targetDepartment = :department', { department });
    }

    const duplicate = await query.getOne();

    return duplicate;
  }

  async getInteractionStatus(materialId: string, userId: string) {
    const isFavorited = await this.favoriteRepo.exists({
      where: { material: { id: materialId }, user: { id: userId } },
    });

    const rating = await this.ratingRepo.findOne({
      where: { material: { id: materialId }, user: { id: userId } },
    });

    return { isFavorited, userRating: rating?.value ?? 0 };
  }

  async addContributor(materialId: string, userId: string) {
    const material = await this.materialRepo.findOne({
      where: { id: materialId },
      relations: ['contributors'],
    });

    if (!material) throw new NotFoundException('Material not found');

    const user = await this.usersService.getOne(userId);

    // Check if already a contributor or uploader
    if (material.uploader.id === userId) {
      return material; // Already uploader
    }

    if (!material.contributors.find((c) => c.id === userId)) {
      material.contributors.push(user);
      await this.materialRepo.save(material);
    }

    return material;
  }

  async addAnnotation(
    materialId: string,
    userId: string,
    data: {
      selectedText: string;
      pageNumber?: number;
      year?: string;
      session?: string;
      noteContent?: string;
      contextBefore?: string;
      contextAfter?: string;
      type?: 'note' | 'pq';
    },
  ) {
    const material = await this.materialRepo.findOneBy({ id: materialId });

    if (!material) throw new NotFoundException('Material not found');

    const user = await this.usersService.getOne(userId);

    const annotation = this.annotationRepo.create({
      material,
      user,
      ...data,
      type: data.type ?? 'note',
    });

    return this.annotationRepo.save(annotation);
  }

  async getAnnotations(materialId: string) {
    return this.annotationRepo.find({
      where: { material: { id: materialId } },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async reportMaterial(
    materialId: string,
    userId: string,
    reason: string,
    description?: string,
  ) {
    const material = await this.materialRepo.findOneBy({ id: materialId });

    if (!material) throw new NotFoundException('Material not found');

    const user = await this.usersService.getOne(userId);

    const report = this.reportRepo.create({
      material,
      reporter: user,
      reason,
      description,
    });

    return this.reportRepo.save(report);
  }

  async saveNote(userId: string, materialId: string, content: string) {
    let note = await this.noteRepo.findOne({
      where: { userId, materialId },
    });

    if (note) {
      note.content = content;
    } else {
      note = this.noteRepo.create({
        userId,
        materialId,
        content,
      });
    }

    return this.noteRepo.save(note);
  }

  async getNote(userId: string, materialId: string) {
    return this.noteRepo.findOne({
      where: { userId, materialId },
    });
  }

  // Public Notes CRUD
  async createPublicNote(
    materialId: string,
    userId: string,
    data: {
      selectedText: string;
      note: string;
      pageNumber?: number;
      contextBefore?: string;
      contextAfter?: string;
    },
  ) {
    const publicNote = this.publicNoteRepo.create({
      materialId,
      userId,
      selectedText: data.selectedText,
      note: data.note,
      pageNumber: data.pageNumber,
      contextBefore: data.contextBefore,
      contextAfter: data.contextAfter,
    });

    return this.publicNoteRepo.save(publicNote);
  }

  async getPublicNotes(materialId: string, userId?: string) {
    const notes = await this.publicNoteRepo.find({
      where: { materialId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    // Add user vote status if userId provided
    if (userId) {
      const votes = await this.publicNoteVoteRepo.find({
        where: { userId },
      });
      const voteMap = new Map(votes.map((v) => [v.noteId, v.value]));

      return notes.map((note) => ({
        ...note,
        userVote: voteMap.get(note.id) ?? 0,
        user: {
          id: note.user.id,
          firstName: note.user.firstName,
          lastName: note.user.lastName,
        },
      }));
    }

    return notes.map((note) => ({
      ...note,
      userVote: 0,
      user: {
        id: note.user.id,
        firstName: note.user.firstName,
        lastName: note.user.lastName,
      },
    }));
  }

  async deletePublicNote(noteId: string, userId: string) {
    const note = await this.publicNoteRepo.findOne({
      where: { id: noteId, userId },
    });

    if (!note) {
      throw new NotFoundException('Note not found or you are not the author');
    }

    await this.publicNoteRepo.delete(noteId);

    return { success: true };
  }

  async votePublicNote(noteId: string, userId: string, value: number) {
    // value should be 1 (upvote), -1 (downvote), or 0 (remove vote)
    const normalizedValue = Math.max(-1, Math.min(1, value));

    const note = await this.publicNoteRepo.findOne({
      where: { id: noteId },
      relations: ['user'],
    });

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    // Check if user is voting on their own note
    const isOwnNote = note.user?.id === userId;

    const existingVote = await this.publicNoteVoteRepo.findOne({
      where: { noteId, userId },
    });

    let isNewUpvote = false;

    if (normalizedValue === 0) {
      // Remove vote
      if (existingVote) {
        // Undo the old vote from counts
        if (existingVote.value === 1) {
          note.upvotes = Math.max(0, note.upvotes - 1);
        } else if (existingVote.value === -1) {
          note.downvotes = Math.max(0, note.downvotes - 1);
        }
        await this.publicNoteVoteRepo.delete(existingVote.id);
      }
    } else if (existingVote) {
      // Update existing vote
      if (existingVote.value !== normalizedValue) {
        // Undo old vote
        if (existingVote.value === 1) {
          note.upvotes = Math.max(0, note.upvotes - 1);
        } else if (existingVote.value === -1) {
          note.downvotes = Math.max(0, note.downvotes - 1);
        }
        // Apply new vote
        if (normalizedValue === 1) {
          note.upvotes += 1;
          isNewUpvote = existingVote.value !== 1; // Changed to upvote
        } else {
          note.downvotes += 1;
        }
        existingVote.value = normalizedValue;
        await this.publicNoteVoteRepo.save(existingVote);
      }
    } else {
      // Create new vote
      const newVote = this.publicNoteVoteRepo.create({
        noteId,
        userId,
        value: normalizedValue,
      });

      await this.publicNoteVoteRepo.save(newVote);
      if (normalizedValue === 1) {
        note.upvotes += 1;
        isNewUpvote = true;
      } else {
        note.downvotes += 1;
      }
    }

    await this.publicNoteRepo.save(note);

    // Award reputation to note author for upvotes (but not for self-votes)
    if (isNewUpvote && !isOwnNote && note.user) {
      await this.usersService.increaseReputation(note.user.id, 3); // UPVOTE_RECEIVED
    }

    return {
      upvotes: note.upvotes,
      downvotes: note.downvotes,
      userVote: normalizedValue,
    };
  }

  // ===== FLAGGING METHODS =====

  async flagMaterial(
    materialId: string,
    userId: string,
    reason: FlagReason,
    description?: string,
  ) {
    // Check if material exists
    const material = await this.materialRepo.findOne({
      where: { id: materialId },
    });

    if (!material) {
      throw new NotFoundException('Material not found');
    }

    // Check if user already flagged this material
    const existingFlag = await this.flagRepo.findOne({
      where: { materialId, userId },
    });

    if (existingFlag) {
      throw new BadRequestException('You have already reported this material');
    }

    // Create the flag
    const flag = this.flagRepo.create({
      materialId,
      userId,
      reason,
      description,
    });

    await this.flagRepo.save(flag);

    // Increment flag count
    material.flagCount += 1;

    // Auto-hide if 3+ flags
    if (material.flagCount >= 3) {
      material.isHidden = true;
    }

    await this.materialRepo.save(material);

    return { success: true, flagCount: material.flagCount };
  }

  async getFlaggedMaterials(limit = 50) {
    return this.materialRepo.find({
      where: { flagCount: 1 }, // At least 1 flag
      relations: ['uploader'],
      order: { flagCount: 'DESC', createdAt: 'DESC' },
      take: limit,
    });
  }

  async getMaterialFlags(materialId: string) {
    return this.flagRepo.find({
      where: { materialId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async dismissFlags(materialId: string) {
    const material = await this.materialRepo.findOne({
      where: { id: materialId },
    });

    if (!material) {
      throw new NotFoundException('Material not found');
    }

    // Update all flags to dismissed
    await this.flagRepo.update(
      { materialId },
      { status: FlagStatus.DISMISSED },
    );

    // Reset flag count and unhide
    material.flagCount = 0;
    material.isHidden = false;
    await this.materialRepo.save(material);

    return { success: true };
  }

  async forceDeleteMaterial(materialId: string) {
    const material = await this.materialRepo.findOne({
      where: { id: materialId },
    });

    if (!material) {
      throw new NotFoundException('Material not found');
    }

    await this.materialRepo.remove(material);

    return { success: true };
  }

  // ==================== Page Bookmarks ====================

  /**
   * Create a bookmark for a specific page in a material
   */
  async createBookmark(
    userId: string,
    materialId: string,
    pageNumber: number,
    note?: string,
  ) {
    // Check if bookmark already exists for this page
    const existing = await this.bookmarkRepo.findOne({
      where: {
        userId,
        materialId,
        pageNumber,
      },
    });

    if (existing) {
      // Update note if provided
      if (note !== undefined) {
        existing.note = note;
        await this.bookmarkRepo.save(existing);
      }

      return existing;
    }

    // Create new bookmark
    const bookmark = this.bookmarkRepo.create({
      userId,
      materialId,
      pageNumber,
      note,
    });

    return this.bookmarkRepo.save(bookmark);
  }

  /**
   * Get all bookmarks for a material by a user
   */
  async getBookmarks(userId: string, materialId: string) {
    const bookmarks = await this.bookmarkRepo.find({
      where: {
        userId,
        materialId,
      },
      order: { pageNumber: 'ASC' },
    });

    return bookmarks.map((b) => ({
      id: b.id,
      pageNumber: b.pageNumber,
      note: b.note,
      createdAt: b.createdAt,
    }));
  }

  /**
   * Delete a bookmark
   */
  async deleteBookmark(userId: string, bookmarkId: string) {
    const bookmark = await this.bookmarkRepo.findOne({
      where: {
        id: bookmarkId,
        userId,
      },
    });

    if (!bookmark) {
      throw new NotFoundException('Bookmark not found');
    }

    await this.bookmarkRepo.remove(bookmark);

    return { success: true };
  }

  // ==================== Recommendations ====================

  /**
   * Get recommended materials based on what others in the same department are reading
   */
  async getRecommendations(user: User, limit = 5) {
    if (!user.department) {
      // Fallback to trending if no department
      return this.materialRepo.find({
        order: {
          favoritesCount: 'DESC',
          createdAt: 'DESC',
        },
        take: limit,
        relations: ['uploader'],
      });
    }

    const deptName =
      typeof user.department === 'string'
        ? user.department
        : (user.department as Department).name;

    // specific materials the user has already seen
    const userViewed = await this.viewingHistoryRepo
      .createQueryBuilder('history')
      .select('history.materialId')
      .where('history.user.id = :userId', { userId: user.id })
      .getRawMany();

    const excludedIds = userViewed.map((v) => v.history_materialId);

    if (excludedIds.length === 0)
      excludedIds.push('00000000-0000-0000-0000-000000000000'); // Dummy UUID

    // Find popular materials in same department, excluding what user has seen
    const popularInDept = await this.viewingHistoryRepo
      .createQueryBuilder('history')
      .leftJoin('history.user', 'user')
      .select('history.material.id', 'materialId')
      .addSelect('COUNT(history.id)', 'count')
      .where('user.department = :deptName', { deptName })
      .andWhere('history.material.id NOT IN (:...excludedIds)', { excludedIds })
      .groupBy('history.material.id')
      .orderBy('count', 'DESC')
      .limit(limit)
      .getRawMany();

    const materialIds = popularInDept.map((r) => r.materialId);

    if (materialIds.length === 0) {
      // Fallback: Just return trending materials user hasn't seen
      return this.materialRepo
        .createQueryBuilder('material')
        .leftJoinAndSelect('material.uploader', 'uploader')
        .where('material.id NOT IN (:...excludedIds)', { excludedIds })
        .orderBy('material.favoritesCount', 'DESC')
        .take(limit)
        .getMany();
    }

    // Fetch full material objects for the recommended IDs
    // We use createQueryBuilder to maintain the order of IDs if possible,
    // or just fetch and let client sort (or just return popular ones)
    return this.materialRepo
      .createQueryBuilder('material')
      .leftJoinAndSelect('material.uploader', 'uploader')
      .whereInIds(materialIds)
      .getMany();
  }

  // ===== ADMIN METHODS =====

  async updateBulkVisibility(
    materialIds: string[],
    scope: string,
    departmentId?: string,
    facultyId?: string,
  ) {
    if (!materialIds || materialIds.length === 0) {
      return { updated: 0 };
    }

    const validScopes = [
      'public',
      'faculty',
      'department',
      'course',
      'private',
    ];

    if (!validScopes.includes(scope)) {
      throw new BadRequestException(
        `Invalid scope. Must be one of: ${validScopes.join(', ')}`,
      );
    }

    const result = await this.materialRepo
      .createQueryBuilder()
      .update()
      .set({ scope: scope as AccessScope })
      .whereInIds(materialIds)
      .execute();

    return {
      updated: result.affected ?? 0,
      scope,
      departmentId,
      facultyId,
    };
  }

  async getAllMaterialsAdmin(page = 1, limit = 50) {
    const [materials, total] = await this.materialRepo.findAndCount({
      relations: ['uploader', 'course', 'course.department'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Map to simplified response
    const data = materials.map((m) => ({
      id: m.id,
      title: m.title,
      scope: m.scope,
      type: m.type,
      status: m.status,
      createdAt: m.createdAt,
      uploader: {
        id: m.uploader.id,
        firstName: m.uploader.firstName,
        lastName: m.uploader.lastName,
        email: m.uploader.email,
      },
      course: m.course
        ? {
            id: m.course.id,
            title: m.course.title,
            department: {
              id: m.course.department.id,
              name: m.course.department.name,
            },
          }
        : null,
    }));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

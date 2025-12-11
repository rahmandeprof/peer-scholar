import { InjectQueue } from '@nestjs/bull';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';

import {
  AccessScope,
  Material,
  MaterialStatus,
} from './entities/material.entity';
import { MaterialAnnotation } from './entities/material-annotation.entity';
import { MaterialFavorite } from './entities/material-favorite.entity';
import { MaterialRating } from './entities/material-rating.entity';
import { MaterialReport } from './entities/material-report.entity';
import { Note } from './entities/note.entity';
import { PublicNote, PublicNoteVote } from './entities/public-note.entity';
import { Course } from '@/app/academic/entities/course.entity';
import { User } from '@/app/users/entities/user.entity';

import { CreateMaterialDto } from './dto/create-material.dto';

import { ConversionService } from '@/app/common/services/conversion.service';
import { UsersService } from '@/app/users/users.service';

import axios from 'axios';
import { Queue } from 'bull';
import { v2 as cloudinary } from 'cloudinary';
import { Brackets, Repository, WhereExpressionBuilder } from 'typeorm';

@Injectable()
export class MaterialsService {
  constructor(
    @InjectRepository(Material)
    private materialRepo: Repository<Material>,
    @InjectRepository(Course)
    private courseRepo: Repository<Course>,
    private configService: ConfigService,
    @InjectQueue('materials') private materialsQueue: Queue,
    private usersService: UsersService,
    private conversionService: ConversionService,
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
  ) {
    cloudinary.config({
      cloud_name: this.configService.get('CLOUD_NAME'),
      api_key: this.configService.get('CLOUD_API_KEY'),
      api_secret: this.configService.get('CLOUD_API_SECRET'),
    });
  }

  // ... (existing getPresignedUrl)

  async create(dto: CreateMaterialDto, user: User) {
    // ... (existing create logic)

    const material = this.materialRepo.create({
      // ... (existing fields)
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
      status: MaterialStatus.PENDING,
      fileHash: dto.fileHash, // Add fileHash
      parent: dto.parentMaterialId
        ? ({ id: dto.parentMaterialId } as Material)
        : undefined,
    });

    // ... (rest of create)
    const savedMaterial = await this.materialRepo.save(material);

    // ...
    return savedMaterial;
  }

  // ... (existing methods)

  getPresignedUrl() {
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
    };
  }

  async getTrending(user: User) {
    const query = this.materialRepo
      .createQueryBuilder('material')
      .leftJoinAndSelect('material.uploader', 'uploader');

    // Apply the same access scope filtering as findAll
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

  async findAll(user: User, courseId?: string, type?: string, search?: string) {
    const query = this.materialRepo
      .createQueryBuilder('material')
      .leftJoinAndSelect('material.uploader', 'uploader');

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

    if (user.yearOfStudy) {
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

    return query.getMany();
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

  async getFavorites(userId: string) {
    const favorites = await this.favoriteRepo.find({
      where: { user: { id: userId } },
      relations: ['material', 'material.uploader'],
      order: { createdAt: 'DESC' },
    });

    return favorites.map((fav) => ({
      // eslint-disable-next-line @typescript-eslint/no-misused-spread
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
      year: string;
      session: string;
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
        userVote: voteMap.get(note.id) || 0,
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

    const note = await this.publicNoteRepo.findOne({ where: { id: noteId } });
    if (!note) {
      throw new NotFoundException('Note not found');
    }

    const existingVote = await this.publicNoteVoteRepo.findOne({
      where: { noteId, userId },
    });

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
      } else {
        note.downvotes += 1;
      }
    }

    await this.publicNoteRepo.save(note);

    return {
      upvotes: note.upvotes,
      downvotes: note.downvotes,
      userVote: normalizedValue,
    };
  }
}

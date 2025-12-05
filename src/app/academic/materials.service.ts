import { InjectQueue } from '@nestjs/bull';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';

import {
  AccessScope,
  Material,
  MaterialStatus,
} from './entities/material.entity';
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
  ) {
    cloudinary.config({
      cloud_name: this.configService.get('CLOUD_NAME'),
      api_key: this.configService.get('CLOUD_API_KEY'),
      api_secret: this.configService.get('CLOUD_API_SECRET'),
    });
  }

  getPresignedUrl() {
    const timestamp = Math.floor(new Date().getTime() / 1000);
    const folder = 'materials';

    // Determine resource type based on file type
    const resourceType = 'auto';

    /*
    if (fileType.startsWith('image/')) {
      resourceType = 'image';
    } else if (fileType.startsWith('video/') || fileType.startsWith('audio/')) {
      resourceType = 'video';
    } else {
      resourceType = 'raw';
    }
    */

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
      cloudTimestamp: timestamp,
      apiKey: this.configService.get('CLOUD_API_KEY'),
      folder,
      uploadPreset: 'ml_default',
      uniqueFilename: true,
      overwrite: true,
    };
  }

  async create(dto: CreateMaterialDto, user: User) {
    // We no longer link to a specific Course entity to allow for flexible visibility
    // based on department/public scope rather than hard database relations.
    // The courseCode string is used for identification and grouping.

    const material = this.materialRepo.create({
      title: dto.title,
      description: dto.description,
      type: dto.type,
      fileUrl: dto.fileUrl,
      fileType: dto.fileType,
      size: dto.size,
      scope: dto.scope,
      tags: dto.tags,
      course: undefined, // Explicitly not linking
      courseCode: dto.courseCode,
      targetFaculty: dto.targetFaculty,
      targetDepartment: dto.targetDepartment,
      topic: dto.topic,
      targetYear: dto.targetYear,
      uploader: user,
      status: MaterialStatus.PENDING,
    });

    const savedMaterial = await this.materialRepo.save(material);

    try {
      await this.materialsQueue.add('process-material', {
        materialId: savedMaterial.id,
        fileUrl: savedMaterial.fileUrl,
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to add material to processing queue', error);
      // Continue without processing - material is saved
    }

    await this.usersService.increaseReputation(user.id, 10);

    return savedMaterial;
  }

  async getTrending() {
    return this.materialRepo.find({
      order: { createdAt: 'DESC' },
      take: 5,
      relations: ['uploader'], // Removed 'course' relation as it might be null
    });
  }

  async getCourseTopics(courseId: string) {
    // We need to find the course code first
    const course = await this.courseRepo.findOneBy({ id: courseId });

    if (!course) return [];

    const materials = await this.materialRepo.find({
      where: { courseCode: course.code },
      select: ['tags'],
    });

    const topicCounts: Record<string, number> = {};

    materials.forEach((material) => {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (material.tags) {
        material.tags.forEach((tag) => {
          const normalizedTag = tag.trim().toLowerCase(); // Normalize

          if (normalizedTag) {
            topicCounts[normalizedTag] = (topicCounts[normalizedTag] || 0) + 1;
          }
        });
      }
    });

    // Convert to array and sort
    return Object.entries(topicCounts)
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10
  }

  async findAll(user: User, courseId?: string, type?: string, search?: string) {
    const query = this.materialRepo
      .createQueryBuilder('material')
      .leftJoinAndSelect('material.uploader', 'uploader');
    // Removed join with course/department since we rely on stored fields

    if (courseId) {
      // Find the course to get its code
      const course = await this.courseRepo.findOneBy({ id: courseId });

      if (course) {
        query.andWhere('material.courseCode = :courseCode', {
          courseCode: course.code,
        });
      } else {
        // If course not found, maybe return empty or ignore?
        // Let's return empty to be safe
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

    // Access Control Logic
    // Public: Everyone can see
    // Department: Only users in the same department can see
    // Private: Only uploader can see

    query.andWhere(
      new Brackets((qb: WhereExpressionBuilder) => {
        qb.where('material.scope = :publicScope', {
          publicScope: AccessScope.PUBLIC,
        }).orWhere('material.uploaderId = :userId', { userId: user.id });

        if (user.department) {
          const userDeptName =
            typeof user.department === 'string'
              ? user.department
              : (user.department as { name: string }).name;

          // Check if material is scoped to department AND matches user's department
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

    // Log the generated query
    // console.log(query.getSql(), query.getParameters());

    const materials = await query.getMany();

    return materials;
  }

  async updateScope(id: string, scope: AccessScope, userId: string) {
    const material = await this.findOne(id);

    if (material.uploader.id !== userId) {
      throw new Error('Only the uploader can update the scope');
    }

    material.scope = scope;

    return this.materialRepo.save(material);
  }

  async findOne(id: string) {
    const material = await this.materialRepo.findOne({
      where: { id },
      relations: ['uploader', 'course'],
    });

    if (!material) {
      throw new NotFoundException('Material not found');
    }

    return material;
  }

  async extractText(id: string) {
    const material = await this.findOne(id);

    if (material.content) {
      return { content: material.content };
    }

    try {
      // Fetch file buffer
      const response = await axios.get(material.fileUrl, {
        responseType: 'arraybuffer',
      });
      const buffer = Buffer.from(response.data);

      const text = await this.conversionService.extractText(
        buffer,
        material.fileType,
        material.title, // Use title as filename proxy if needed
      );

      if (text) {
        material.content = text;
        await this.materialRepo.save(material);
      }

      return { content: text };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to extract text on demand', error);
      throw new Error('Failed to extract text');
    }
  }
}

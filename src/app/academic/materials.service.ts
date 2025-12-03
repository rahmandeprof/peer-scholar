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

import { UsersService } from '@/app/users/users.service';

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
  ) {
    cloudinary.config({
      cloud_name: this.configService.get('CLOUD_NAME'),
      api_key: this.configService.get('CLOUD_API_KEY'),
      api_secret: this.configService.get('CLOUD_API_SECRET'),
    });
  }

  getPresignedUrl() {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const params = {
      timestamp,
      folder: 'materials',
    };

    const apiSecret = this.configService.get<string>('CLOUD_API_SECRET') ?? '';
    const cloudName = this.configService.get<string>('CLOUD_NAME') ?? '';

    const signature = cloudinary.utils.api_sign_request(params, apiSecret);

    return {
      url: `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
      signature,
      timestamp,
      apiKey: this.configService.get('CLOUD_API_KEY'),
      folder: 'materials',
    };
  }

  async create(dto: CreateMaterialDto, user: User) {
    let course: Course | null = null;

    if (dto.courseId) {
      course = await this.courseRepo.findOneBy({ id: dto.courseId });
      if (!course) throw new NotFoundException('Course not found');
    } else if (dto.courseCode) {
      // Try to find by code, or create if not exists (optional, or just link by code)
      course = await this.courseRepo.findOneBy({ code: dto.courseCode });
      if (!course) {
        // Create a new course if it doesn't exist
        // We might need to infer department from user or targetDepartment
        // For now, let's create it without a department if we can't determine it
        // Or better, just leave course as null and rely on courseCode string
        // But the entity has a relation. Let's try to create it.
        course = this.courseRepo.create({
          code: dto.courseCode,
          title: dto.courseCode, // Fallback title
          // department: ... we don't know the department for sure unless we look it up
        });
        course = await this.courseRepo.save(course);
      }
    }

    const material = this.materialRepo.create({
      title: dto.title,
      description: dto.description,
      type: dto.type,
      fileUrl: dto.fileUrl,
      fileType: dto.fileType,
      size: dto.size,
      scope: dto.scope,
      tags: dto.tags,
      course: course ?? undefined, // Link if found/created
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
      relations: ['uploader', 'course'],
    });
  }

  async getCourseTopics(courseId: string) {
    const materials = await this.materialRepo.find({
      where: { course: { id: courseId } },
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
      .leftJoinAndSelect('material.uploader', 'uploader')
      .leftJoinAndSelect('material.course', 'course')
      .leftJoinAndSelect('course.department', 'department');

    if (courseId) {
      query.where('material.courseId = :courseId', { courseId });
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
    // Course: Only users in the same course (not implemented yet, treating as Dept for now)
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

          qb.orWhere(
            '(material.scope = :deptScope AND (department.name = :userDeptName OR material.targetDepartment = :userDeptName))',
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

    // eslint-disable-next-line no-console
    console.log(
      `Found ${materials.length.toString()} materials for user ${user.id}`,
    );

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
}

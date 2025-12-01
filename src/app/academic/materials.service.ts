import { InjectQueue } from '@nestjs/bull';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';

import { Material, MaterialStatus } from './entities/material.entity';
import { Course } from '@/app/academic/entities/course.entity';
import { User } from '@/app/users/entities/user.entity';

import { CreateMaterialDto } from './dto/create-material.dto';

import { UsersService } from '@/app/users/users.service';

import { Queue } from 'bull';
import { v2 as cloudinary } from 'cloudinary';
import { Repository } from 'typeorm';

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

    const apiSecret =
      this.configService.get<string>('CLOUD_API_SECRET') ?? '';
    const cloudName =
      this.configService.get<string>('CLOUD_NAME') ?? '';

    const signature = cloudinary.utils.api_sign_request(params, apiSecret);

    return {
      url: `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
      signature,
      timestamp,
      apiKey: this.configService.get('cloudinary.apiKey'),
      folder: 'materials',
    };
  }

  async create(dto: CreateMaterialDto, user: User) {
    const course = await this.courseRepo.findOneBy({ id: dto.courseId });

    if (!course) throw new NotFoundException('Course not found');

    const material = this.materialRepo.create({
      title: dto.title,
      description: dto.description,
      type: dto.type,
      fileUrl: dto.fileUrl,
      fileType: dto.fileType,
      size: dto.size,
      scope: dto.scope,
      tags: dto.tags,
      course,
      uploader: user,
      status: MaterialStatus.PENDING,
    });

    const savedMaterial = await this.materialRepo.save(material);

    await this.materialsQueue.add('process-material', {
      materialId: savedMaterial.id,
      fileUrl: savedMaterial.fileUrl,
    });

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

  findAll(courseId: string, type?: string, search?: string) {
    const query = this.materialRepo
      .createQueryBuilder('material')
      .leftJoinAndSelect('material.uploader', 'uploader')
      .where('material.courseId = :courseId', { courseId });

    if (type && type !== 'all') {
      query.andWhere('material.type = :type', { type });
    }

    if (search) {
      query.andWhere(
        '(LOWER(material.title) LIKE LOWER(:search) OR LOWER(material.description) LIKE LOWER(:search))',
        { search: `%${search}%` },
      );
    }

    query.orderBy('material.createdAt', 'DESC');

    return query.getMany();
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

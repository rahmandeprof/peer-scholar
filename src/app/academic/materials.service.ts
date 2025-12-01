import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';

import { Material, MaterialStatus } from './entities/material.entity';
import { Course } from '@/app/academic/entities/course.entity';
import { User } from '@/app/users/entities/user.entity';

import { CreateMaterialDto } from './dto/create-material.dto';

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
  ) {
    const cloudinaryConfig = this.configService.get('cloudinary');

    cloudinary.config({
      cloud_name: cloudinaryConfig.cloudName,
      api_key: cloudinaryConfig.apiKey,
      api_secret: cloudinaryConfig.apiSecret,
    });
  }

  getPresignedUrl() {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const params = {
      timestamp,
      folder: 'materials',
    };

    const apiSecret =
      this.configService.get<string>('cloudinary.apiSecret') ?? '';
    const cloudName =
      this.configService.get<string>('cloudinary.cloudName') ?? '';

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
      status: MaterialStatus.READY,
    });

    return this.materialRepo.save(material);
  }

  findAll(courseId: string) {
    return this.materialRepo.find({
      where: { course: { id: courseId } },
      relations: ['uploader'],
      order: { createdAt: 'DESC' },
    });
  }
}

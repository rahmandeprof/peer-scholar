import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Material } from './entities/material.entity';
import { PersonalCourse } from './entities/personal-course.entity';

import { Repository } from 'typeorm';

@Injectable()
export class PersonalCoursesService {
  constructor(
    @InjectRepository(PersonalCourse)
    private courseRepo: Repository<PersonalCourse>,
    @InjectRepository(Material)
    private materialRepo: Repository<Material>,
  ) {}

  async create(
    userId: string,
    data: { title: string; code?: string; color?: string },
  ) {
    const course = this.courseRepo.create({
      ...data,
      userId,
    });

    return this.courseRepo.save(course);
  }

  async findAll(userId: string) {
    return this.courseRepo.find({
      where: { userId },
      relations: ['materials'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(userId: string, id: string) {
    return this.courseRepo.findOne({
      where: { id, userId },
      relations: ['materials', 'materials.uploader'],
    });
  }

  async addMaterial(userId: string, courseId: string, materialId: string) {
    const course = await this.findOne(userId, courseId);

    if (!course) throw new Error('Course not found');

    const material = await this.materialRepo.findOne({
      where: { id: materialId },
    });

    if (!material) throw new Error('Material not found');

    // Check if already exists to avoid duplicates
    if (!course.materials.some((m) => m.id === material.id)) {
      course.materials.push(material);

      return this.courseRepo.save(course);
    }

    return course;
  }

  async removeMaterial(userId: string, courseId: string, materialId: string) {
    const course = await this.findOne(userId, courseId);

    if (!course) throw new Error('Course not found');

    course.materials = course.materials.filter((m) => m.id !== materialId);

    return this.courseRepo.save(course);
  }

  async remove(userId: string, id: string) {
    return this.courseRepo.delete({ id, userId });
  }
}

import { Controller, Get, Post, UseGuards, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InjectQueue } from '@nestjs/bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Queue } from 'bull';

import { UsersService } from '@/app/users/users.service';
import { Material, MaterialStatus, ProcessingStatus } from '@/app/academic/entities/material.entity';

import { Role } from '@/app/auth/decorators';

import { Paginate, PaginateQuery } from 'nestjs-paginate';

@Controller('admin')
@UseGuards(AuthGuard('jwt'))
@Role('admin')
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(
    private readonly usersService: UsersService,
    @InjectRepository(Material)
    private readonly materialRepo: Repository<Material>,
    @InjectQueue('materials')
    private readonly materialsQueue: Queue,
  ) { }

  @Get('users')
  findAll(@Paginate() query: PaginateQuery) {
    return this.usersService.findAll(query);
  }

  /**
   * Reprocess all stuck materials (pending status)
   * Finds materials that are stuck in PENDING status and queues them for processing
   */
  @Post('reprocess-stuck')
  async reprocessStuckMaterials() {
    this.logger.log('Admin requested reprocessing of stuck materials');

    // Find all materials that are stuck in pending status
    const stuckMaterials = await this.materialRepo.find({
      where: [
        { status: MaterialStatus.PENDING },
        { processingStatus: ProcessingStatus.PENDING },
      ],
      select: ['id', 'title', 'fileUrl', 'status', 'processingStatus', 'createdAt'],
      order: { createdAt: 'DESC' },
    });

    if (stuckMaterials.length === 0) {
      return {
        success: true,
        message: 'No stuck materials found',
        count: 0,
        materials: [],
      };
    }

    // Queue all materials for processing
    const queued: string[] = [];
    const failed: string[] = [];

    for (const material of stuckMaterials) {
      try {
        await this.materialsQueue.add('process-material', {
          materialId: material.id,
          fileUrl: material.fileUrl,
        });
        queued.push(material.id);
        this.logger.log(`Queued stuck material for processing: ${material.id} (${material.title})`);
      } catch (error) {
        failed.push(material.id);
        this.logger.error(`Failed to queue material ${material.id}:`, error);
      }
    }

    return {
      success: true,
      message: `Queued ${queued.length} materials for reprocessing`,
      count: queued.length,
      failed: failed.length,
      materials: stuckMaterials.map(m => ({
        id: m.id,
        title: m.title,
        status: m.status,
        processingStatus: m.processingStatus,
        createdAt: m.createdAt,
      })),
    };
  }

  /**
   * Get count of stuck materials
   */
  @Get('stuck-materials/count')
  async getStuckMaterialsCount() {
    const count = await this.materialRepo.count({
      where: [
        { status: MaterialStatus.PENDING },
        { processingStatus: ProcessingStatus.PENDING },
      ],
    });

    return { count };
  }
}

/**
 * ProcessingStatusController - Exposes endpoints for document processing status
 */
import { InjectQueue } from '@nestjs/bull';
import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';

import { DocumentSegment } from '@/app/academic/entities/document-segment.entity';
import {
  Material,
  ProcessingStatus,
} from '@/app/academic/entities/material.entity';

import { Queue } from 'bull';
import { Repository } from 'typeorm';

import { DOCUMENT_PROCESSING_QUEUE } from '../processors/document.processor';

export interface ProcessingStatusResponse {
  materialId: string;
  processingStatus: ProcessingStatus;
  segmentCount: number;
  isReady: boolean;
  canRetry: boolean;
}

@Controller('processing')
@UseGuards(AuthGuard('jwt'))
export class ProcessingStatusController {
  constructor(
    @InjectRepository(Material)
    private readonly materialRepo: Repository<Material>,
    @InjectRepository(DocumentSegment)
    private readonly segmentRepo: Repository<DocumentSegment>,
    @InjectQueue(DOCUMENT_PROCESSING_QUEUE)
    private readonly processingQueue: Queue,
  ) {}

  /**
   * Get processing status for a material
   */
  @Get(':materialId/status')
  async getStatus(
    @Param('materialId') materialId: string,
  ): Promise<ProcessingStatusResponse> {
    const material = await this.materialRepo.findOne({
      where: { id: materialId },
      select: ['id', 'processingStatus', 'fileUrl', 'fileType', 'title'],
    });

    if (!material) {
      return {
        materialId,
        processingStatus: ProcessingStatus.FAILED,
        segmentCount: 0,
        isReady: false,
        canRetry: false,
      };
    }

    const segmentCount = await this.segmentRepo.count({
      where: { materialId },
    });

    const isReady =
      material.processingStatus === ProcessingStatus.COMPLETED &&
      segmentCount > 0;
    const canRetry =
      material.processingStatus === ProcessingStatus.FAILED ||
      material.processingStatus === ProcessingStatus.PENDING;

    return {
      materialId,
      processingStatus: material.processingStatus,
      segmentCount,
      isReady,
      canRetry,
    };
  }

  /**
   * Retry processing for a failed material
   */
  @Post(':materialId/retry')
  async retryProcessing(
    @Param('materialId') materialId: string,
  ): Promise<{ success: boolean; message: string }> {
    const material = await this.materialRepo.findOne({
      where: { id: materialId },
    });

    if (!material) {
      return { success: false, message: 'Material not found' };
    }

    // Only allow retry for failed or pending materials
    if (
      material.processingStatus !== ProcessingStatus.FAILED &&
      material.processingStatus !== ProcessingStatus.PENDING
    ) {
      return {
        success: false,
        message: `Cannot retry: material is currently ${material.processingStatus}`,
      };
    }

    // Delete existing segments before reprocessing
    await this.segmentRepo.delete({ materialId });

    // Reset status
    await this.materialRepo.update(materialId, {
      processingStatus: ProcessingStatus.PENDING,
    });

    // Queue the processing job
    await this.processingQueue.add('process-document', {
      materialId,
      fileUrl: material.fileUrl,
      mimeType: material.fileType,
      filename: material.title,
    });

    return { success: true, message: 'Processing requeued' };
  }

  /**
   * Get segment count for a material
   */
  @Get(':materialId/segments/count')
  async getSegmentCount(
    @Param('materialId') materialId: string,
  ): Promise<{ count: number }> {
    const count = await this.segmentRepo.count({ where: { materialId } });

    return { count };
  }
}

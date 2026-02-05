import { InjectQueue } from '@nestjs/bull';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { DocumentSegment } from '../academic/entities/document-segment.entity';
import {
  FlashcardItem,
  Material,
  MaterialStatus,
  ProcessingStatus,
  ProcessingVersion,
} from '../academic/entities/material.entity';

import { SegmentSelectorService } from '@/app/document-processing/services/segment-selector.service';

import { FlashcardGenerator } from '@/app/quiz-engine';

import { Queue } from 'bull';
import { Repository } from 'typeorm';

@Injectable()
export class FlashcardService {
  private readonly logger = new Logger(FlashcardService.name);

  constructor(
    @InjectRepository(Material)
    private readonly materialRepo: Repository<Material>,
    @InjectRepository(DocumentSegment)
    private readonly segmentRepo: Repository<DocumentSegment>,
    @InjectQueue('materials') private readonly materialsQueue: Queue,
    private readonly flashcardGenerator: FlashcardGenerator,
    private readonly segmentSelector: SegmentSelectorService,
  ) {}

  async generateFlashcards(
    materialId: string,
    cardCount?: number,
    pageStart?: number,
    pageEnd?: number,
  ) {
    const material = await this.materialRepo.findOne({
      where: { id: materialId },
    });

    if (!material) throw new NotFoundException('Material not found');

    // Check if material is still being processed (legacy status check)
    if (
      material.status === MaterialStatus.PROCESSING ||
      material.status === MaterialStatus.PENDING
    ) {
      throw new BadRequestException(
        'PROCESSING: This material is still being analyzed. Please wait a moment and try again.',
      );
    }

    // Check processing status for segment-based materials
    if (
      material.processingStatus === ProcessingStatus.EXTRACTING ||
      material.processingStatus === ProcessingStatus.CLEANING ||
      material.processingStatus === ProcessingStatus.SEGMENTING
    ) {
      throw new BadRequestException(
        'PROCESSING: This material is still being segmented. Please wait a moment and try again.',
      );
    }

    // Check if material processing failed
    if (
      material.status === MaterialStatus.FAILED ||
      material.processingStatus === ProcessingStatus.FAILED
    ) {
      throw new BadRequestException(
        'UNSUPPORTED: This document could not be processed. It may be a scanned image, password-protected, or in an unsupported format.',
      );
    }

    // Return cached flashcards if:
    // - No page range specified (full doc flashcards)
    // - Flashcards exist and were generated for current material version
    const cacheValid =
      material.flashcards &&
      material.flashcards.length > 0 &&
      material.flashcardGeneratedVersion === material.materialVersion;

    if (!pageStart && !pageEnd && cacheValid) {
      this.logger.log(
        `[CACHE-HIT] Flashcard cache hit for material ${materialId}, returning ${material.flashcards?.length ?? 0} cached cards`,
      );

      return material.flashcards;
    }

    // Log cache miss reason
    const missReason =
      pageStart || pageEnd
        ? 'page-range-specified'
        : !material.flashcards
          ? 'no-cached-flashcards'
          : material.flashcards.length === 0
            ? 'empty-cached-flashcards'
            : 'version-mismatch';

    this.logger.log(
      `[CACHE-MISS] Flashcard cache miss for material ${materialId}, reason: ${missReason}`,
    );

    // Try to use segments first (new architecture)
    const segmentCount = await this.segmentRepo.count({
      where: { materialId },
    });

    // Lazy upgrade: If v1 document with no segments, trigger upgrade
    if (
      material.processingVersion === ProcessingVersion.V1 &&
      segmentCount === 0
    ) {
      // Queue background upgrade
      const job = await this.materialsQueue.add('upgrade-to-v2', {
        materialId,
      });

      this.logger.log(
        `[LAZY-UPGRADE] Triggered flashcard upgrade for v1 material ${materialId}, job ${job.id}`,
      );

      // Return upgrading status - frontend should poll for completion
      return {
        status: 'upgrading',
        message: 'Preparing this material for smart study...',
        materialId,
      };
    }

    if (segmentCount > 0) {
      // Use segment-based generation
      const { segments } = await this.segmentSelector.selectSegments(
        materialId,
        {
          maxTokens: 8000,
          maxSegments: 20,
          pageStart,
          pageEnd,
        },
      );

      if (segments.length === 0) {
        throw new BadRequestException(
          'No content segments found for flashcard generation.',
        );
      }

      const result = await this.flashcardGenerator.generateFromSegments(
        segments,
        material.title,
        cardCount || 10,
      );

      if (!result.success || !result.data) {
        this.logger.error(
          `Flashcard generation from segments failed: ${result.error}`,
        );
        throw new UnprocessableEntityException(
          result.error || 'Failed to generate flashcards. Please try again.',
        );
      }

      const flashcards = result.data;

      // Cache the result if it's a full flashcard set (no page range)
      if (!pageStart && !pageEnd && flashcards.length > 0) {
        material.flashcards = flashcards as FlashcardItem[];
        material.flashcardGeneratedVersion = material.materialVersion;
        await this.materialRepo.save(material);
      }

      return flashcards;
    }

    // Fallback: Use legacy content-based generation for materials without segments
    const materialContent = material.content;

    if (!materialContent || materialContent.trim().length < 50) {
      throw new BadRequestException(
        "This material doesn't have enough content for flashcard generation. It may need to be reprocessed.",
      );
    }

    // Use legacy FlashcardGenerator method
    const result = await this.flashcardGenerator.generate({
      topic: material.title,
      cardCount: cardCount || 10,
      textSegment: materialContent,
      materialId: material.id,
    });

    if (!result.success || !result.data) {
      this.logger.error(`Flashcard generation failed: ${result.error}`);
      throw new UnprocessableEntityException(
        result.error || 'Failed to generate flashcards. Please try again.',
      );
    }

    const flashcards = result.data;

    // Cache the result if full document
    if (!pageStart && !pageEnd && flashcards.length > 0) {
      material.flashcards = flashcards as FlashcardItem[];
      material.flashcardGeneratedVersion = material.materialVersion;
      await this.materialRepo.save(material);
    }

    return flashcards;
  }
}

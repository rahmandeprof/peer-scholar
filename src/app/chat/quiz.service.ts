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
  Material,
  MaterialStatus,
  ProcessingStatus,
  ProcessingVersion,
  QuizQuestion as EntityQuizQuestion,
} from '../academic/entities/material.entity';
import { QuizResult } from './entities/quiz-result.entity';
import { User } from '@/app/users/entities/user.entity';

import { SegmentSelectorService } from '@/app/document-processing/services/segment-selector.service';

import { QuizDifficulty, QuizGenerator } from '@/app/quiz-engine';

import { Queue } from 'bull';
import { Repository } from 'typeorm';

@Injectable()
export class QuizService {
  private readonly logger = new Logger(QuizService.name);

  constructor(
    @InjectRepository(Material)
    private readonly materialRepo: Repository<Material>,
    @InjectRepository(QuizResult)
    private readonly quizResultRepo: Repository<QuizResult>,
    @InjectRepository(DocumentSegment)
    private readonly segmentRepo: Repository<DocumentSegment>,
    @InjectQueue('materials') private readonly materialsQueue: Queue,
    private readonly quizGenerator: QuizGenerator,
    private readonly segmentSelector: SegmentSelectorService,
  ) {}

  async generateQuiz(
    materialId: string,
    pageStart?: number,
    pageEnd?: number,
    regenerate?: boolean,
    difficulty?: QuizDifficulty,
    questionCount?: number,
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

    // Return cached quiz if:
    // - No page range was requested (full doc quiz)
    // - Not explicitly regenerating
    // - Quiz exists and was generated for current material version
    const cacheValid =
      material.quiz &&
      material.quiz.length > 0 &&
      material.quizGeneratedVersion === material.materialVersion;

    if (!pageStart && !pageEnd && !regenerate && cacheValid) {
      this.logger.log(
        `[CACHE-HIT] Quiz cache hit for material ${materialId}, returning ${material.quiz?.length ?? 0} cached questions`,
      );

      return material.quiz;
    }

    // Log cache miss reason
    const missReason =
      pageStart || pageEnd
        ? 'page-range-specified'
        : regenerate
          ? 'regenerate-requested'
          : !material.quiz
            ? 'no-cached-quiz'
            : material.quiz.length === 0
              ? 'empty-cached-quiz'
              : 'version-mismatch';

    this.logger.log(
      `[CACHE-MISS] Quiz cache miss for material ${materialId}, reason: ${missReason}`,
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
        `[LAZY-UPGRADE] Triggered upgrade for v1 material ${materialId}, job ${job.id}`,
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
          pageStart,
          pageEnd,
          maxTokens: 8000,
          maxSegments: 20,
        },
      );

      if (segments.length === 0) {
        throw new BadRequestException(
          'No content segments found for the specified page range.',
        );
      }

      const result = await this.quizGenerator.generateFromSegments(
        segments,
        material.title,
        difficulty || QuizDifficulty.INTERMEDIATE,
        questionCount || 5,
      );

      if (!result.success || !result.data) {
        this.logger.error(
          `Quiz generation from segments failed: ${result.error}`,
        );
        throw new UnprocessableEntityException(
          result.error || 'Failed to generate quiz. Please try again.',
        );
      }

      const quiz = result.data.questions;

      // Cache the result ONLY if it's a full quiz (no page range specified)
      if (!pageStart && !pageEnd && quiz.length > 0) {
        material.quiz = quiz as EntityQuizQuestion[];
        material.quizGeneratedVersion = material.materialVersion;
        await this.materialRepo.save(material);
      }

      return quiz;
    }

    // Fallback: Use legacy content-based generation for materials without segments
    const materialContent = material.content;

    if (!materialContent || materialContent.trim().length < 50) {
      throw new BadRequestException(
        "This material doesn't have enough content for quiz generation. It may need to be reprocessed.",
      );
    }

    // Build text segment for legacy generation
    const CHARS_PER_PAGE = 3000;
    let textSegment = materialContent;

    if (pageStart || pageEnd) {
      const startChar = pageStart ? (pageStart - 1) * CHARS_PER_PAGE : 0;
      const endChar = pageEnd
        ? pageEnd * CHARS_PER_PAGE
        : materialContent.length;

      textSegment = materialContent.substring(startChar, endChar);
    }

    // Use legacy QuizGenerator method
    const result = await this.quizGenerator.generate({
      topic: material.title,
      difficulty: difficulty || QuizDifficulty.INTERMEDIATE,
      questionCount: questionCount || 5,
      textSegment,
      materialId: material.id,
    });

    if (!result.success || !result.data) {
      this.logger.error(`Quiz generation failed: ${result.error}`);
      throw new UnprocessableEntityException(
        result.error || 'Failed to generate quiz. Please try again.',
      );
    }

    const quiz = result.data.questions;

    // Cache the result ONLY if it's a full quiz (no page range specified)
    if (!pageStart && !pageEnd && quiz.length > 0) {
      material.quiz = quiz as EntityQuizQuestion[];
      material.quizGeneratedVersion = material.materialVersion;
      await this.materialRepo.save(material);
    }

    return quiz;
  }

  async saveQuizResult(
    user: User,
    materialId: string,
    score: number,
    totalQuestions: number,
  ) {
    const material = await this.materialRepo.findOne({
      where: { id: materialId },
    });

    if (!material) throw new NotFoundException('Material not found');

    const result = this.quizResultRepo.create({
      user,
      material,
      score,
      totalQuestions,
    });

    this.logger.log(
      `Saving quiz result for user ${user.id}, material ${materialId}, score ${String(score)}/${String(totalQuestions)}`,
    );

    return this.quizResultRepo.save(result);
  }

  getQuizHistory(user: User) {
    return this.quizResultRepo.find({
      where: { user: { id: user.id } },
      relations: ['material'],
      order: { createdAt: 'DESC' },
    });
  }
}

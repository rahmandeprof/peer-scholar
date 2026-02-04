/**
 * LegacyExtractionService
 *
 * READ-ONLY wrapper for v1 document extraction.
 * Used by: legacy AI flows, material preview, content display for v1 documents.
 *
 * DO NOT MODIFY - preserved for backward compatibility.
 *
 * Features that still rely on legacy extraction:
 * - v1 document quiz/flashcard generation (uses material.content)
 * - Material preview/content display
 * - Legacy summaries and key points
 */
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import {
  Material,
  ProcessingVersion,
} from '../../academic/entities/material.entity';

import { ConversionService } from '../../common/services/conversion.service';

import { Repository } from 'typeorm';

@Injectable()
export class LegacyExtractionService {
  private readonly logger = new Logger(LegacyExtractionService.name);

  constructor(
    @InjectRepository(Material)
    private readonly materialRepo: Repository<Material>,
    private readonly conversionService: ConversionService,
  ) {}

  /**
   * Get content for a v1 document.
   * Returns the pre-extracted content stored in the material.content field.
   *
   * @param materialId - The material ID
   * @returns The extracted text content, or null if not available
   */
  async getContent(materialId: string): Promise<string | null> {
    const material = await this.materialRepo.findOne({
      where: { id: materialId },
      select: ['id', 'content', 'processingVersion'],
    });

    if (!material) {
      this.logger.warn(`Material not found: ${materialId}`);

      return null;
    }

    // Only use legacy extraction for v1 documents
    if (material.processingVersion !== ProcessingVersion.V1) {
      this.logger.debug(
        `Material ${materialId} is v2, use segment-based extraction instead`,
      );

      return null;
    }

    return material.content || null;
  }

  /**
   * Check if a material uses legacy extraction.
   *
   * @param materialId - The material ID
   * @returns True if the material is v1 (legacy), false otherwise
   */
  async isLegacyDocument(materialId: string): Promise<boolean> {
    const material = await this.materialRepo.findOne({
      where: { id: materialId },
      select: ['id', 'processingVersion'],
    });

    if (!material) return false;

    return material.processingVersion === ProcessingVersion.V1;
  }

  /**
   * Get content from buffer using legacy extraction methods.
   * Delegates to ConversionService for actual extraction.
   *
   * @param buffer - File buffer
   * @param mimetype - File MIME type
   * @param originalname - Original filename
   * @returns Extracted text content
   */
  async extractFromBuffer(
    buffer: Buffer,
    mimetype: string,
    originalname: string,
  ): Promise<string> {
    return this.conversionService.extractText(buffer, mimetype, originalname);
  }

  /**
   * Check if a material has extractable content.
   *
   * @param materialId - The material ID
   * @returns True if content is available and non-empty
   */
  async hasContent(materialId: string): Promise<boolean> {
    const content = await this.getContent(materialId);

    return !!content && content.trim().length > 50;
  }
}

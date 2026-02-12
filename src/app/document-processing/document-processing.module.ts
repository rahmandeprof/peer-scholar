/**
 * DocumentProcessingModule - Handles document text extraction, cleaning, and segmentation
 */
import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CommonModule } from '../common/common.module';

import { DocumentSegment } from '../academic/entities/document-segment.entity';
import { Material } from '../academic/entities/material.entity';

import { ProcessingStatusController } from './controllers/processing-status.controller';

import { CleanerService } from './services/cleaner.service';
import { ExtractorService } from './services/extractor.service';
import { LegacyExtractionService } from './services/legacy-extraction.service';
import { OcrService } from './services/ocr.service';
import { PdfImageService } from './services/pdf-image.service';
import { SegmentSelectorService } from './services/segment-selector.service';
import { SegmenterService } from './services/segmenter.service';

import {
  DOCUMENT_PROCESSING_QUEUE,
  DocumentProcessor,
} from './processors/document.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([Material, DocumentSegment]),
    BullModule.registerQueue({
      name: DOCUMENT_PROCESSING_QUEUE,
    }),
    BullModule.registerQueue({
      name: 'materials',
    }),
    CommonModule,
  ],
  controllers: [ProcessingStatusController],
  providers: [
    ExtractorService,
    CleanerService,
    SegmenterService,
    SegmentSelectorService,
    LegacyExtractionService,
    OcrService,
    PdfImageService,
    DocumentProcessor,
  ],
  exports: [
    ExtractorService,
    CleanerService,
    SegmenterService,
    SegmentSelectorService,
    LegacyExtractionService,
    OcrService,
    PdfImageService,
    DocumentProcessor,
  ],
})
export class DocumentProcessingModule {}

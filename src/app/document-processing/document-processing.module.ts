/**
 * DocumentProcessingModule - Handles document text extraction, cleaning, and segmentation
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';

import { Material } from '../academic/entities/material.entity';
import { DocumentSegment } from '../academic/entities/document-segment.entity';

import { ExtractorService } from './services/extractor.service';
import { CleanerService } from './services/cleaner.service';
import { SegmenterService } from './services/segmenter.service';
import { SegmentSelectorService } from './services/segment-selector.service';
import { LegacyExtractionService } from './services/legacy-extraction.service';
import { OcrService } from './services/ocr.service';
import { PdfImageService } from './services/pdf-image.service';

import { DocumentProcessor, DOCUMENT_PROCESSING_QUEUE } from './processors/document.processor';
import { ProcessingStatusController } from './controllers/processing-status.controller';

import { CommonModule } from '../common/common.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Material, DocumentSegment]),
        BullModule.registerQueue({
            name: DOCUMENT_PROCESSING_QUEUE,
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
export class DocumentProcessingModule { }


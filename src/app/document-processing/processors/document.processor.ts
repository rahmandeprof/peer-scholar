/**
 * DocumentProcessor - BullMQ worker for document text extraction and segmentation
 * Handles the full pipeline: extract → clean → segment → store
 */
import { Processor, Process, OnQueueError, OnQueueFailed } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';

import { Material, MaterialStatus, ProcessingStatus } from '../../academic/entities/material.entity';
import { DocumentSegment } from '../../academic/entities/document-segment.entity';
import { ExtractorService, ExtractionResult } from '../services/extractor.service';
import { CleanerService } from '../services/cleaner.service';
import { SegmenterService, TextSegment } from '../services/segmenter.service';
import { OcrService } from '../services/ocr.service';
import { PdfImageService } from '../services/pdf-image.service';

export const DOCUMENT_PROCESSING_QUEUE = 'document-processing';

export interface DocumentProcessingJobData {
    materialId: string;
    fileUrl: string;
    mimeType: string;
    filename: string;
}

@Injectable()
@Processor(DOCUMENT_PROCESSING_QUEUE)
export class DocumentProcessor {
    private readonly logger = new Logger(DocumentProcessor.name);

    constructor(
        @InjectRepository(Material)
        private readonly materialRepo: Repository<Material>,
        @InjectRepository(DocumentSegment)
        private readonly segmentRepo: Repository<DocumentSegment>,
        private readonly extractorService: ExtractorService,
        private readonly cleanerService: CleanerService,
        private readonly segmenterService: SegmenterService,
        private readonly ocrService: OcrService,
        private readonly pdfImageService: PdfImageService,
    ) { }

    @Process('process-document')
    async processDocument(job: Job<DocumentProcessingJobData>): Promise<void> {
        const { materialId, fileUrl, mimeType, filename } = job.data;

        this.logger.log(`Starting document processing for material ${materialId}`);

        try {
            // Update status: EXTRACTING
            await this.updateProcessingStatus(materialId, ProcessingStatus.EXTRACTING);
            await job.progress(10);

            // Download file
            const fileBuffer = await this.downloadFile(fileUrl);
            await job.progress(20);

            // Extract text
            let extractionResult = await this.extractorService.extract(
                fileBuffer,
                mimeType,
                filename,
            );
            await job.progress(40);

            let isOcr = false;
            let ocrConfidence: number | undefined;

            // Check if OCR is needed (scanned PDF detected)
            if (extractionResult.requiresOcr && mimeType.includes('pdf')) {
                this.logger.warn(`Scanned PDF detected for ${materialId}, triggering OCR`);
                await this.updateProcessingStatus(materialId, ProcessingStatus.OCR_EXTRACTING);

                try {
                    // Convert PDF pages to images
                    const images = await this.pdfImageService.convertToImages(fileBuffer);
                    await job.progress(50);

                    // Run OCR on images
                    const ocrResult = await this.ocrService.extractFromImages(images);
                    await job.progress(60);

                    extractionResult = {
                        text: this.ocrService.cleanOcrText(ocrResult.text),
                        pageCount: ocrResult.pageCount,
                        isOcr: true,
                    };
                    isOcr = true;
                    ocrConfidence = ocrResult.confidence;

                    this.logger.log(`OCR completed for ${materialId}: ${ocrResult.text.length} chars, ${ocrResult.confidence.toFixed(1)}% confidence`);
                } catch (ocrError) {
                    this.logger.error(`OCR failed for ${materialId}: ${ocrError instanceof Error ? ocrError.message : ocrError}`);
                    throw new Error(`Scanned PDF detected but OCR failed: ${ocrError instanceof Error ? ocrError.message : 'Unknown error'}`);
                }
            }

            if (!extractionResult.text || extractionResult.text.trim().length < 50) {
                throw new Error('Extracted text is too short or empty');
            }

            // Update status: CLEANING
            await this.updateProcessingStatus(materialId, ProcessingStatus.CLEANING);

            // Clean text (OCR text gets additional cleaning)
            const cleanedText = isOcr
                ? this.ocrService.cleanOcrText(this.cleanerService.clean(extractionResult.text))
                : this.cleanerService.clean(extractionResult.text);
            await job.progress(70);

            // Update status: SEGMENTING
            await this.updateProcessingStatus(materialId, ProcessingStatus.SEGMENTING);

            // Segment text (use smaller chunks for OCR output)
            const segments = this.segmenterService.segment(
                cleanedText,
                extractionResult.pages,
                isOcr, // Pass OCR flag for conservative segmentation
            );
            await job.progress(80);

            // Delete existing segments for this material (in case of reprocessing)
            await this.segmentRepo.delete({ materialId });

            // Save segments to database with source tracking
            await this.saveSegments(materialId, segments, isOcr ? 'ocr' : 'text');
            await job.progress(90);

            // Update material with extracted content and mark as completed
            await this.materialRepo.update(materialId, {
                content: cleanedText,
                processingStatus: ProcessingStatus.COMPLETED,
                status: MaterialStatus.READY, // Also update legacy status
                ...(isOcr && {
                    isOcrProcessed: true,
                    ocrConfidence: ocrConfidence,
                }),
            });
            await job.progress(100);

            this.logger.log(
                `Document processing completed for ${materialId}: ${segments.length} segments created`,
            );
        } catch (error) {
            this.logger.error(
                `Document processing failed for ${materialId}: ${error instanceof Error ? error.message : error}`,
            );

            // Mark as failed
            await this.updateProcessingStatus(materialId, ProcessingStatus.FAILED);
            await this.materialRepo.update(materialId, { status: MaterialStatus.FAILED });

            throw error;
        }
    }

    /**
     * Download file from URL
     */
    private async downloadFile(url: string): Promise<Buffer> {
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 60000, // 60 second timeout
        });
        return Buffer.from(response.data);
    }

    /**
     * Update processing status
     */
    private async updateProcessingStatus(
        materialId: string,
        status: ProcessingStatus,
    ): Promise<void> {
        await this.materialRepo.update(materialId, { processingStatus: status });
    }

    /**
     * Save segments to database
     */
    private async saveSegments(
        materialId: string,
        segments: TextSegment[],
        source: 'text' | 'ocr' = 'text',
    ): Promise<void> {
        const entities = segments.map(segment => {
            const entity = new DocumentSegment();
            entity.materialId = materialId;
            entity.text = segment.text;
            entity.tokenCount = segment.tokenCount;
            entity.segmentIndex = segment.segmentIndex;
            entity.pageStart = segment.pageStart;
            entity.pageEnd = segment.pageEnd;
            entity.heading = segment.heading;
            entity.source = source; // Track whether from OCR
            return entity;
        });

        // Batch insert in chunks of 100
        const batchSize = 100;
        for (let i = 0; i < entities.length; i += batchSize) {
            const batch = entities.slice(i, i + batchSize);
            await this.segmentRepo.save(batch);
        }
    }

    @OnQueueError()
    onError(error: Error) {
        this.logger.error(`Queue error: ${error.message}`, error.stack);
    }

    @OnQueueFailed()
    onFailed(job: Job, error: Error) {
        this.logger.error(
            `Job ${job.id} failed for material ${job.data?.materialId}: ${error.message}`,
            error.stack,
        );
    }
}

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

import { Material, ProcessingStatus } from '../../academic/entities/material.entity';
import { DocumentSegment } from '../../academic/entities/document-segment.entity';
import { ExtractorService } from '../services/extractor.service';
import { CleanerService } from '../services/cleaner.service';
import { SegmenterService, TextSegment } from '../services/segmenter.service';

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
            const extractionResult = await this.extractorService.extract(
                fileBuffer,
                mimeType,
                filename,
            );
            await job.progress(40);

            if (!extractionResult.text || extractionResult.text.trim().length < 50) {
                throw new Error('Extracted text is too short or empty');
            }

            // Update status: CLEANING
            await this.updateProcessingStatus(materialId, ProcessingStatus.CLEANING);

            // Clean text
            const cleanedText = this.cleanerService.clean(extractionResult.text);
            await job.progress(60);

            // Update status: SEGMENTING
            await this.updateProcessingStatus(materialId, ProcessingStatus.SEGMENTING);

            // Segment text
            const segments = this.segmenterService.segment(
                cleanedText,
                extractionResult.pages,
            );
            await job.progress(80);

            // Delete existing segments for this material (in case of reprocessing)
            await this.segmentRepo.delete({ materialId });

            // Save segments to database
            await this.saveSegments(materialId, segments);
            await job.progress(90);

            // Update material with extracted content and mark as completed
            await this.materialRepo.update(materialId, {
                content: cleanedText,
                processingStatus: ProcessingStatus.COMPLETED,
                status: 'ready', // Also update legacy status
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
            await this.materialRepo.update(materialId, { status: 'failed' });

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

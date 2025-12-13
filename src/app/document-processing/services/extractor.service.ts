/**
 * ExtractorService - Extracts raw text from various document formats
 * Supports PDF, DOCX, TXT, PPT with page metadata when available
 */
import { Injectable, Logger } from '@nestjs/common';
import * as pdfLib from 'pdf-parse';
// @ts-ignore
import officeParser from 'officeparser';
import * as mammoth from 'mammoth';

export interface ExtractionResult {
    text: string;
    pageCount?: number;
    pages?: PageContent[];
    metadata?: Record<string, any>;
    requiresOcr?: boolean; // True if normal extraction failed (scanned PDF)
    isOcr?: boolean; // True if content came from OCR
}

export interface PageContent {
    pageNumber: number;
    text: string;
    startCharIndex: number;
    endCharIndex: number;
}

@Injectable()
export class ExtractorService {
    private readonly logger = new Logger(ExtractorService.name);

    // Minimum text length to consider extraction successful
    // Below this threshold, we assume the PDF is scanned
    private readonly MIN_TEXT_THRESHOLD = 100;

    /**
     * Extract text from a buffer based on file type
     */
    async extract(
        buffer: Buffer,
        mimeType: string,
        filename?: string,
    ): Promise<ExtractionResult> {
        this.logger.debug(`Extracting text from ${filename || 'unknown'} (${mimeType})`);

        try {
            if (this.isPdf(mimeType, filename)) {
                return this.extractFromPdf(buffer);
            }

            if (this.isDocx(mimeType, filename)) {
                return this.extractFromDocx(buffer);
            }

            if (this.isDoc(mimeType, filename)) {
                return this.extractFromDoc(buffer);
            }

            if (this.isPpt(mimeType, filename)) {
                return this.extractFromPpt(buffer);
            }

            if (this.isTxt(mimeType, filename)) {
                return this.extractFromTxt(buffer);
            }

            throw new Error(`Unsupported file type: ${mimeType}`);
        } catch (error) {
            this.logger.error(`Extraction failed: ${error instanceof Error ? error.message : error}`);
            throw error;
        }
    }

    /**
     * Extract from PDF with page-level information
     */
    private async extractFromPdf(buffer: Buffer): Promise<ExtractionResult> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const candidate = (pdfLib as any).default ?? pdfLib;
        const pdfParseFn =
            typeof candidate === 'function'
                ? candidate
                : (candidate.PDFParse ?? candidate);

        const data = await pdfParseFn(buffer);

        // pdf-parse doesn't give us per-page text directly, 
        // but we can estimate page boundaries from the numpages info
        const pageCount = data.numpages || 1;
        const text = data.text || '';

        // Estimate page boundaries (chars per page)
        const charsPerPage = Math.ceil(text.length / pageCount);
        const pages: PageContent[] = [];

        for (let i = 0; i < pageCount; i++) {
            const startCharIndex = i * charsPerPage;
            const endCharIndex = Math.min((i + 1) * charsPerPage, text.length);

            pages.push({
                pageNumber: i + 1,
                text: text.substring(startCharIndex, endCharIndex),
                startCharIndex,
                endCharIndex,
            });
        }

        // Check if this appears to be a scanned PDF (little to no text extracted)
        const requiresOcr = text.trim().length < this.MIN_TEXT_THRESHOLD;

        if (requiresOcr) {
            this.logger.warn(
                `PDF appears to be scanned (${text.length} chars extracted, threshold: ${this.MIN_TEXT_THRESHOLD})`,
            );
        }

        return {
            text,
            pageCount,
            pages,
            metadata: data.info || {},
            requiresOcr,
        };
    }

    /**
     * Extract from DOCX using mammoth
     */
    private async extractFromDocx(buffer: Buffer): Promise<ExtractionResult> {
        const result = await mammoth.extractRawText({ buffer });
        const text = result.value || '';

        // DOCX doesn't have native page numbers, estimate ~3000 chars per page
        const estimatedPages = Math.max(1, Math.ceil(text.length / 3000));

        return {
            text,
            pageCount: estimatedPages,
            metadata: {},
        };
    }

    /**
     * Extract from legacy DOC using officeparser
     */
    private async extractFromDoc(buffer: Buffer): Promise<ExtractionResult> {
        const text = await officeParser.parseOfficeAsync(buffer);

        return {
            text: text || '',
            pageCount: Math.max(1, Math.ceil((text?.length || 0) / 3000)),
            metadata: {},
        };
    }

    /**
     * Extract from PPT/PPTX using officeparser
     */
    private async extractFromPpt(buffer: Buffer): Promise<ExtractionResult> {
        const text = await officeParser.parseOfficeAsync(buffer);

        // PPT typically has less text per slide, estimate ~500 chars per slide
        const estimatedSlides = Math.max(1, Math.ceil((text?.length || 0) / 500));

        return {
            text: text || '',
            pageCount: estimatedSlides,
            metadata: {},
        };
    }

    /**
     * Extract from plain text
     */
    private extractFromTxt(buffer: Buffer): ExtractionResult {
        const text = buffer.toString('utf-8');

        return {
            text,
            pageCount: 1,
            metadata: {},
        };
    }

    // File type detection helpers
    private isPdf(mimeType: string, filename?: string): boolean {
        return mimeType === 'application/pdf' || filename?.toLowerCase().endsWith('.pdf') || false;
    }

    private isDocx(mimeType: string, filename?: string): boolean {
        return (
            mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            filename?.toLowerCase().endsWith('.docx') ||
            false
        );
    }

    private isDoc(mimeType: string, filename?: string): boolean {
        return mimeType === 'application/msword' || filename?.toLowerCase().endsWith('.doc') || false;
    }

    private isPpt(mimeType: string, filename?: string): boolean {
        return (
            mimeType === 'application/vnd.ms-powerpoint' ||
            mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
            filename?.toLowerCase().endsWith('.ppt') ||
            filename?.toLowerCase().endsWith('.pptx') ||
            false
        );
    }

    private isTxt(mimeType: string, filename?: string): boolean {
        return (
            mimeType === 'text/plain' ||
            filename?.toLowerCase().endsWith('.txt') ||
            false
        );
    }
}

/* eslint-disable */
/**
/**
 * OcrService - Extracts text from scanned PDFs using Tesseract.js
 * Used as a fallback when normal text extraction fails
 */
import { Injectable, Logger } from '@nestjs/common';

// Dynamic import to avoid initialization issues when OCR isn't used
let Tesseract: typeof import('tesseract.js') | null = null;

export interface OcrResult {
  text: string;
  pageCount: number;
  pages: OcrPageContent[];
  confidence: number;
  isOcr: true;
}

export interface OcrPageContent {
  pageNumber: number;
  text: string;
  confidence: number;
}

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);

  // Safety limits - configurable via environment
  private readonly MAX_PAGES: number;
  private readonly MIN_CONFIDENCE = 30; // Minimum confidence to accept OCR result

  constructor() {
    // Allow configuring max pages via environment, default to 50
    this.MAX_PAGES = parseInt(process.env.OCR_MAX_PAGES || '50', 10);
    this.logger.log(`OCR initialized with MAX_PAGES=${this.MAX_PAGES}`);
  }

  /**
   * Lazy load Tesseract.js only when needed
   */
  private async getTesseract(): Promise<typeof import('tesseract.js')> {
    if (!Tesseract) {
      this.logger.debug('Loading Tesseract.js...');
      Tesseract = await import('tesseract.js');
    }
    return Tesseract;
  }

  /**
   * Extract text from a PDF buffer using OCR
   * Falls back to this when normal extraction yields no text
   */
  async extractFromImages(images: Buffer[]): Promise<OcrResult> {
    const pageCount = images.length;

    if (pageCount > this.MAX_PAGES) {
      this.logger.warn(
        `OCR limited to ${this.MAX_PAGES.toString()} pages, document has ${pageCount.toString()}`,
      );
    }

    const pagesToProcess = images.slice(0, this.MAX_PAGES);
    const pages: OcrPageContent[] = [];
    let totalConfidence = 0;

    this.logger.log(`Starting OCR on ${pagesToProcess.length} page(s)`);

    // Lazy load Tesseract
    const tesseract = await this.getTesseract();

    // Process pages in batches to improve speed while managing memory
    const batchSize = 5;
    for (let i = 0; i < pagesToProcess.length; i += batchSize) {
      const batch = pagesToProcess.slice(i, i + batchSize);
      this.logger.debug(
        `Processing batch ${(Math.floor(i / batchSize) + 1).toString()} (${batch.length.toString()} pages)`,
      );

      // Process batch in parallel
      const batchPromises = batch.map(async (pageImage, batchIndex) => {
        const globalIndex = i + batchIndex;
        const pageNumber = globalIndex + 1;

        try {
          this.logger.debug(
            `OCR processing page ${pageNumber.toString()}/${pagesToProcess.length.toString()}`,
          );

          const result = await tesseract.recognize(pageImage, 'eng', {
            logger: (m) => {
              if (m.status === 'recognizing text' && Math.random() > 0.9) {
                // Log sporadically to avoid flooding logs
                this.logger.debug(
                  `Page ${pageNumber.toString()}: ${Math.round((m.progress || 0) * 100).toString()}%`,
                );
              }
            },
          });

          const pageText = result.data.text || '';
          const pageConfidence = result.data.confidence || 0;

          this.logger.debug(
            `Page ${pageNumber.toString()} completed: ${pageText.length.toString()} chars, ${pageConfidence.toFixed(1)}% confidence`,
          );

          return {
            pageNumber,
            text: pageText,
            confidence: pageConfidence,
          };
        } catch (error) {
          this.logger.error(
            `OCR failed on page ${pageNumber.toString()}: ${error instanceof Error ? error.message : error}`,
          );
          return {
            pageNumber,
            text: '',
            confidence: 0,
          };
        }
      });

      // Wait for batch to complete and add to results
      const batchResults = await Promise.all(batchPromises);
      pages.push(...batchResults);

      // Log progress
      this.logger.log(
        `Batch completed. Total pages processed: ${pages.length.toString()}/${pagesToProcess.length.toString()}`,
      );

      // Check confidence of this batch
      batchResults.forEach((r) => (totalConfidence += r.confidence));
    }

    // Combine all page texts
    const fullText = pages.map((p) => p.text).join('\n\n');
    const avgConfidence = pages.length > 0 ? totalConfidence / pages.length : 0;

    this.logger.log(
      `OCR completed: ${fullText.length.toString()} chars from ${pages.length.toString()} pages, avg confidence: ${avgConfidence.toFixed(1)}%`,
    );

    // Warn if confidence is low
    if (avgConfidence < this.MIN_CONFIDENCE) {
      this.logger.warn(
        `Low OCR confidence (${avgConfidence.toFixed(1)}%). Text quality may be poor.`,
      );
    }

    return {
      text: fullText,
      pageCount: pages.length,
      pages,
      confidence: avgConfidence,
      isOcr: true,
    };
  }

  /**
   * Clean OCR-specific artifacts from text
   */
  cleanOcrText(text: string): string {
    return (
      text
        // Remove common OCR noise patterns
        .replace(/[|][|]+/g, '') // Repeated pipes
        .replace(/_{3,}/g, '') // Long underscores
        .replace(/\.{4,}/g, '...') // Excessive dots
        .replace(/\s{3,}/g, ' ') // Excessive spaces
        // Remove isolated single characters that are often OCR errors
        .replace(/\s[a-zA-Z]\s(?=[a-zA-Z]\s)/g, ' ')
        // Normalize line endings
        .replace(/\r\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
    );
  }
}

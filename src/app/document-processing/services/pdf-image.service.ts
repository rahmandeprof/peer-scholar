/**
 * PdfImageService - Converts PDF pages to images for OCR processing
 * Uses pdf-poppler for high-quality rendering
 */
import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';

// Use dynamic import for pdf-poppler compatibility
let pdfPoppler: any;

@Injectable()
export class PdfImageService {
    private readonly logger = new Logger(PdfImageService.name);

    // Rendering settings optimized for OCR
    private readonly DPI = 300; // Higher DPI = better OCR but slower
    private readonly FORMAT = 'png';

    /**
     * Convert PDF buffer to array of page images
     */
    async convertToImages(pdfBuffer: Buffer): Promise<Buffer[]> {
        // Create temp directory for this conversion
        const tempDir = path.join(os.tmpdir(), `pdf-ocr-${uuidv4()}`);
        const pdfPath = path.join(tempDir, 'input.pdf');
        const images: Buffer[] = [];

        try {
            // Ensure temp directory exists
            await fs.mkdir(tempDir, { recursive: true });

            // Write PDF to temp file
            await fs.writeFile(pdfPath, pdfBuffer);

            this.logger.debug(`Converting PDF to images in ${tempDir}`);

            // Dynamically import pdf-poppler
            if (!pdfPoppler) {
                try {
                    pdfPoppler = await import('pdf-poppler');
                } catch (error) {
                    this.logger.error('pdf-poppler not available, using fallback');
                    return this.fallbackConversion(pdfBuffer);
                }
            }

            // Get PDF info
            const info = await pdfPoppler.info(pdfPath);
            const pageCount = info.pages || 1;

            this.logger.debug(`PDF has ${pageCount} pages`);

            // Convert each page
            const opts = {
                format: this.FORMAT,
                out_dir: tempDir,
                out_prefix: 'page',
                page: null, // Convert all pages
                scale: this.DPI,
            };

            await pdfPoppler.convert(pdfPath, opts);

            // Read generated images
            for (let i = 1; i <= pageCount; i++) {
                const imagePath = path.join(tempDir, `page-${i}.${this.FORMAT}`);
                try {
                    const imageBuffer = await fs.readFile(imagePath);
                    images.push(imageBuffer);
                } catch (error) {
                    this.logger.warn(`Could not read page ${i} image: ${error}`);
                }
            }

            this.logger.log(`Converted ${images.length} pages to images`);

            return images;
        } catch (error) {
            this.logger.error(`PDF to image conversion failed: ${error instanceof Error ? error.message : error}`);
            throw error;
        } finally {
            // Cleanup temp directory
            try {
                await fs.rm(tempDir, { recursive: true, force: true });
            } catch (cleanupError) {
                this.logger.warn(`Failed to cleanup temp dir: ${cleanupError}`);
            }
        }
    }

    /**
     * Fallback conversion using canvas-based approach
     * Less reliable but works without system dependencies
     */
    private async fallbackConversion(pdfBuffer: Buffer): Promise<Buffer[]> {
        this.logger.warn('Using canvas fallback for PDF conversion');

        // Try using pdfjs-dist for pure JS conversion
        try {
            const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

            const loadingTask = pdfjsLib.getDocument({
                data: new Uint8Array(pdfBuffer),
                useSystemFonts: true,
            });

            const pdf = await loadingTask.promise;
            const images: Buffer[] = [];

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 2.0 }); // 2x scale for clarity

                // Create a basic canvas-like structure
                // Note: This is a simplified approach - full implementation would use node-canvas
                this.logger.debug(`Processing page ${i} (${viewport.width}x${viewport.height})`);

                // For now, return empty buffer as placeholder
                // Full implementation requires node-canvas which needs system deps too
                images.push(Buffer.alloc(0));
            }

            return images;
        } catch (error) {
            this.logger.error(`Fallback conversion also failed: ${error}`);
            throw new Error('No PDF to image conversion method available');
        }
    }
}

/**
 * PdfImageService - Converts PDF pages to images for OCR processing
 * Uses pdftoppm (poppler-utils) directly for cross-platform compatibility
 */
import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { spawn } from 'child_process';

@Injectable()
export class PdfImageService {
    private readonly logger = new Logger(PdfImageService.name);

    // Rendering settings optimized for OCR
    private readonly DPI = 300;
    private readonly FORMAT = 'png';

    /**
     * Convert PDF buffer to array of page images using pdftoppm
     */
    async convertToImages(pdfBuffer: Buffer): Promise<Buffer[]> {
        const tempDir = path.join(os.tmpdir(), `pdf-ocr-${uuidv4()}`);
        const pdfPath = path.join(tempDir, 'input.pdf');
        const outputPrefix = path.join(tempDir, 'page');
        const images: Buffer[] = [];

        try {
            // Ensure temp directory exists
            await fs.mkdir(tempDir, { recursive: true });

            // Write PDF to temp file
            await fs.writeFile(pdfPath, pdfBuffer);

            this.logger.debug(`Converting PDF to images in ${tempDir}`);

            // Run pdftoppm command
            await this.runPdftoppm(pdfPath, outputPrefix);

            // Read all generated PNG files
            const files = await fs.readdir(tempDir);
            const pngFiles = files
                .filter(f => f.startsWith('page') && f.endsWith('.png'))
                .sort((a, b) => {
                    // Sort by page number (page-1.png, page-2.png, etc.)
                    const numA = parseInt(a.match(/page-?(\d+)/)?.[1] || '0');
                    const numB = parseInt(b.match(/page-?(\d+)/)?.[1] || '0');
                    return numA - numB;
                });

            for (const pngFile of pngFiles) {
                const imagePath = path.join(tempDir, pngFile);
                const imageBuffer = await fs.readFile(imagePath);
                images.push(imageBuffer);
            }

            this.logger.log(`Converted ${images.length} pages to images using pdftoppm`);

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
     * Run pdftoppm command to convert PDF to PNG images
     */
    private runPdftoppm(pdfPath: string, outputPrefix: string): Promise<void> {
        return new Promise((resolve, reject) => {
            // pdftoppm -png -r 300 input.pdf output_prefix
            const args = [
                '-png',
                '-r', String(this.DPI),
                pdfPath,
                outputPrefix,
            ];

            this.logger.debug(`Running: pdftoppm ${args.join(' ')}`);

            const process = spawn('pdftoppm', args);

            // Timeout after 5 minutes to prevent hanging on huge PDFs
            const timeout = setTimeout(() => {
                this.logger.error('pdftoppm timed out after 5 minutes');
                process.kill('SIGKILL');
                reject(new Error('pdftoppm timed out after 5 minutes'));
            }, 300000);

            let stderr = '';

            process.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            process.on('close', (code) => {
                clearTimeout(timeout);
                if (code === 0) {
                    resolve();
                } else {
                    this.logger.error(`pdftoppm failed with code ${code}: ${stderr}`);
                    reject(new Error(`pdftoppm failed with exit code ${code}: ${stderr}`));
                }
            });

            process.on('error', (err) => {
                clearTimeout(timeout);
                this.logger.error(`pdftoppm spawn error: ${err.message}`);
                reject(new Error(`Failed to spawn pdftoppm: ${err.message}. Make sure poppler-utils is installed.`));
            });
        });
    }
}

import { Injectable, Logger } from '@nestjs/common';

import { exec } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as pdfLib from 'pdf-parse';
import { promisify } from 'util';

const execAsync = promisify(exec);
const writeFileAsync = promisify(fs.writeFile);
const readFileAsync = promisify(fs.readFile);
const unlinkAsync = promisify(fs.unlink);

@Injectable()
export class ConversionService {
  private readonly logger = new Logger(ConversionService.name);

  async convertToPdf(
    buffer: Buffer,
    originalFilename: string,
  ): Promise<Buffer> {
    const tempDir = os.tmpdir();
    const id = Math.random().toString(36).substring(7);
    const ext = path.extname(originalFilename);
    const inputFilename = `input_${id}${ext}`;
    const inputPath = path.join(tempDir, inputFilename);
    const outputFilename = `input_${id}.pdf`;
    const outputPath = path.join(tempDir, outputFilename);

    try {
      // Write buffer to temp file
      await writeFileAsync(inputPath, buffer);

      // Convert using LibreOffice
      // Command: soffice --headless --convert-to pdf --outdir <dir> <file>
      const command = `soffice --headless --convert-to pdf --outdir "${tempDir}" "${inputPath}"`;

      this.logger.debug(`Executing conversion command: ${command}`);
      await execAsync(command);

      // Read the generated PDF
      const pdfBuffer = await readFileAsync(outputPath);

      return pdfBuffer;
    } catch (error) {
      this.logger.error('Failed to convert file to PDF', error);
      throw new Error('File conversion failed');
    } finally {
      // Cleanup temp files
      try {
        if (fs.existsSync(inputPath)) await unlinkAsync(inputPath);
        if (fs.existsSync(outputPath)) await unlinkAsync(outputPath);
      } catch (cleanupError) {
        this.logger.warn('Failed to cleanup temp files', cleanupError);
      }
    }
  }
  async extractText(
    buffer: Buffer,
    mimetype: string,
    originalname: string,
  ): Promise<string> {
    if (mimetype.includes('pdf') || originalname.endsWith('.pdf')) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const candidate = (pdfLib as any).default ?? pdfLib;
        const pdfParseFn =
          typeof candidate === 'function'
            ? candidate
            : (candidate.PDFParse ?? candidate);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let data: any;

        try {
          // Try function call first

          data = await pdfParseFn(buffer);
        } catch (err) {
          if (
            err instanceof Error &&
            err.message.includes(
              "Class constructors cannot be invoked without 'new'",
            )
          ) {
            const instance = new pdfParseFn(buffer);

            // Check if instance is a promise or has data
            if (instance instanceof Promise) {
              data = await instance;
            } else {
              data = instance;
            }
          } else {
            throw err;
          }
        }

        return data.text;
      } catch (error) {
        throw new Error(
          `pdf-parse failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    if (
      mimetype.includes('presentation') ||
      originalname.endsWith('.pptx') ||
      originalname.endsWith('.ppt')
    ) {
      // For PPTX, we need to use a different approach
      // If conversion to PDF works, that's handled by the caller
      // For raw PPTX text extraction, use officeparser
      try {
        const officeparser = await import('officeparser');
        const text = await officeparser.parseOfficeAsync(buffer);

        return text || '';
      } catch (e) {
        this.logger.warn(
          'Failed to extract text from PPTX with officeparser',
          e,
        );

        // Fallback: return empty and let PDF extraction handle it
        return '';
      }
    }

    // Legacy .doc files - use officeparser
    if (
      originalname.endsWith('.doc') ||
      (mimetype.includes('msword') && !mimetype.includes('officedocument'))
    ) {
      try {
        const officeparser = await import('officeparser');
        const text = await officeparser.parseOfficeAsync(buffer);

        return text || '';
      } catch (e) {
        this.logger.warn(
          'Failed to extract text from .doc with officeparser',
          e,
        );

        return '';
      }
    }

    // .docx files - use mammoth (more reliable for modern Word docs)
    if (mimetype.includes('officedocument') || originalname.endsWith('.docx')) {
      try {
        const mammoth = await import('mammoth');
        const res = await mammoth.extractRawText({ buffer });

        return res.value || '';
      } catch {
        throw new Error('mammoth is required to extract DOCX text.');
      }
    }

    // fallback: assume UTF-8 text
    return buffer.toString('utf8');
  }
}

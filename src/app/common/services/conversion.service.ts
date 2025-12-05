import { Injectable, Logger } from '@nestjs/common';

import { exec } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import pdfParse from 'pdf-parse';
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
        const data = await pdfParse(buffer);

        return data.text;
      } catch {
        throw new Error('pdf-parse is required to extract PDF text.');
      }
    }

    if (
      mimetype.includes('officedocument') ||
      mimetype.includes('msword') ||
      originalname.endsWith('.docx')
    ) {
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

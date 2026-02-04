/**
 * CleanerService - Cleans extracted text by removing noise, headers, footers, and artifacts
 */
import { Injectable, Logger } from '@nestjs/common';

export interface CleaningOptions {
  removeHeaders?: boolean;
  removeFooters?: boolean;
  removePageNumbers?: boolean;
  normalizeWhitespace?: boolean;
  removeWatermarks?: boolean;
}

@Injectable()
export class CleanerService {
  private readonly logger = new Logger(CleanerService.name);

  private readonly defaultOptions: CleaningOptions = {
    removeHeaders: true,
    removeFooters: true,
    removePageNumbers: true,
    normalizeWhitespace: true,
    removeWatermarks: true,
  };

  /**
   * Clean extracted text by removing noise and normalizing
   */
  clean(text: string, options?: CleaningOptions): string {
    const opts = { ...this.defaultOptions, ...options };
    let cleaned = text;

    if (opts.normalizeWhitespace) {
      cleaned = this.normalizeWhitespace(cleaned);
    }

    if (opts.removePageNumbers) {
      cleaned = this.removePageNumbers(cleaned);
    }

    if (opts.removeHeaders) {
      cleaned = this.removeRepeatingHeaders(cleaned);
    }

    if (opts.removeFooters) {
      cleaned = this.removeRepeatingFooters(cleaned);
    }

    if (opts.removeWatermarks) {
      cleaned = this.removeWatermarks(cleaned);
    }

    // Final cleanup
    cleaned = this.normalizeUnicode(cleaned);
    cleaned = this.removeExcessiveNewlines(cleaned);

    return cleaned.trim();
  }

  /**
   * Normalize whitespace - replace multiple spaces with single space
   */
  private normalizeWhitespace(text: string): string {
    return text
      .replace(/\t/g, ' ') // Tabs to spaces
      .replace(/[ ]{2,}/g, ' ') // Multiple spaces to single
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\r/g, '\n'); // Normalize old Mac line endings
  }

  /**
   * Remove standalone page numbers (e.g., "Page 1", "1 of 10", just "1")
   */
  private removePageNumbers(text: string): string {
    return (
      text
        // "Page X" or "Page X of Y"
        .replace(/^Page\s+\d+(\s+of\s+\d+)?$/gim, '')
        // "X of Y" at start/end of line
        .replace(/^\d+\s+of\s+\d+$/gim, '')
        // Standalone numbers at start of line (likely page numbers)
        .replace(/^[\s]*\d{1,4}[\s]*$/gm, '')
        // "-X-" style page numbers
        .replace(/^[\s]*-\s*\d+\s*-[\s]*$/gm, '')
    );
  }

  /**
   * Detect and remove repeating headers (text that appears at the start of many "pages")
   */
  private removeRepeatingHeaders(text: string): string {
    // Split into paragraphs and look for repeating patterns
    const paragraphs = text.split(/\n{2,}/);

    if (paragraphs.length < 3) return text;

    // Count frequency of first 100 chars of each paragraph
    const headerCandidates = new Map<string, number>();

    for (const para of paragraphs) {
      const first100 = para.slice(0, 100).trim().toLowerCase();

      if (first100.length > 10) {
        headerCandidates.set(
          first100,
          (headerCandidates.get(first100) || 0) + 1,
        );
      }
    }

    // Find headers that repeat more than 3 times (likely page headers)
    const repeatingHeaders: string[] = [];

    for (const [header, count] of headerCandidates) {
      if (count >= 3) {
        repeatingHeaders.push(header);
      }
    }

    // Remove repeating headers
    if (repeatingHeaders.length > 0) {
      let cleaned = text;

      for (const header of repeatingHeaders) {
        // Escape regex special characters
        const escaped = header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`^${escaped}[^\n]*\n?`, 'gim');

        cleaned = cleaned.replace(regex, '');
      }

      return cleaned;
    }

    return text;
  }

  /**
   * Detect and remove repeating footers
   */
  private removeRepeatingFooters(text: string): string {
    // Similar logic to headers but for end of paragraphs
    const paragraphs = text.split(/\n{2,}/);

    if (paragraphs.length < 3) return text;

    const footerCandidates = new Map<string, number>();

    for (const para of paragraphs) {
      const last100 = para.slice(-100).trim().toLowerCase();

      if (last100.length > 10) {
        footerCandidates.set(last100, (footerCandidates.get(last100) || 0) + 1);
      }
    }

    const repeatingFooters: string[] = [];

    for (const [footer, count] of footerCandidates) {
      if (count >= 3) {
        repeatingFooters.push(footer);
      }
    }

    if (repeatingFooters.length > 0) {
      let cleaned = text;

      for (const footer of repeatingFooters) {
        const escaped = footer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`[^\n]*${escaped}$`, 'gim');

        cleaned = cleaned.replace(regex, '');
      }

      return cleaned;
    }

    return text;
  }

  /**
   * Remove common watermark patterns
   */
  private removeWatermarks(text: string): string {
    return (
      text
        // "CONFIDENTIAL", "DRAFT", etc.
        .replace(/^(CONFIDENTIAL|DRAFT|SAMPLE|PREVIEW|WATERMARK)$/gim, '')
        // Copyright notices
        .replace(/©\s*\d{4}[^\n]*/gi, '')
        // "All rights reserved" lines
        .replace(/^.*all rights reserved.*$/gim, '')
    );
  }

  /**
   * Normalize Unicode characters
   */
  private normalizeUnicode(text: string): string {
    return (
      text
        // Normalize smart quotes
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201C\u201D]/g, '"')
        // Normalize dashes
        .replace(/[\u2013\u2014]/g, '-')
        // Normalize ellipsis
        .replace(/\u2026/g, '...')
        // Remove zero-width characters
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        // Normalize common ligatures
        .replace(/\uFB01/g, 'fi')
        .replace(/\uFB02/g, 'fl')
    );
  }

  /**
   * Remove excessive consecutive newlines (keep max 2)
   */
  private removeExcessiveNewlines(text: string): string {
    return text.replace(/\n{3,}/g, '\n\n');
  }
}

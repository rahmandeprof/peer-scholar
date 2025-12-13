/**
 * SegmenterService - Splits cleaned text into addressable segments
 * Creates chunks of ~300-600 tokens with page metadata
 */
import { Injectable, Logger } from '@nestjs/common';
import { PageContent } from './extractor.service';

export interface TextSegment {
    text: string;
    pageStart?: number;
    pageEnd?: number;
    heading?: string;
    tokenCount: number;
    segmentIndex: number;
}

export interface SegmentationOptions {
    targetTokens?: number;     // Target tokens per segment (default: 400)
    minTokens?: number;        // Minimum tokens per segment (default: 200)
    maxTokens?: number;        // Maximum tokens per segment (default: 600)
    preserveParagraphs?: boolean;
}

@Injectable()
export class SegmenterService {
    private readonly logger = new Logger(SegmenterService.name);

    private readonly defaultOptions: SegmentationOptions = {
        targetTokens: 400,
        minTokens: 200,
        maxTokens: 600,
        preserveParagraphs: true,
    };

    // OCR-specific options with smaller chunks for noisy text
    private readonly ocrOptions: SegmentationOptions = {
        targetTokens: 250,
        minTokens: 100,
        maxTokens: 350,
        preserveParagraphs: true,
    };

    /**
     * Segment text into chunks with optional page information
     * @param isOcr If true, uses conservative segmentation for OCR output
     */
    segment(
        text: string,
        pages?: PageContent[],
        isOcr: boolean = false,
    ): TextSegment[] {
        const opts = isOcr
            ? { ...this.ocrOptions }
            : { ...this.defaultOptions };

        if (isOcr) {
            this.logger.debug('Using conservative segmentation for OCR output');
        }

        if (!text || text.trim().length === 0) {
            return [];
        }

        // Split into paragraphs
        const paragraphs = this.splitIntoParagraphs(text);

        // Build segments by merging/splitting paragraphs
        const segments = this.buildSegments(paragraphs, opts);

        // Attach page information if available
        if (pages && pages.length > 0) {
            this.attachPageInfo(segments, text, pages);
        }

        // Detect and attach headings
        this.detectHeadings(segments);

        this.logger.debug(`Created ${segments.length} segments from ${text.length} characters${isOcr ? ' (OCR mode)' : ''}`);

        return segments;
    }

    /**
     * Estimate token count using simple heuristic (chars / 4)
     * More accurate than word count, close to GPT tokenization
     */
    estimateTokens(text: string): number {
        if (!text) return 0;
        // GPT tokens are roughly 4 characters on average
        return Math.ceil(text.length / 4);
    }

    /**
     * Split text into paragraphs
     */
    private splitIntoParagraphs(text: string): string[] {
        return text
            .split(/\n{2,}/)          // Split on double newlines
            .map(p => p.trim())        // Trim whitespace
            .filter(p => p.length > 0); // Remove empty
    }

    /**
     * Build segments from paragraphs, merging small ones and splitting large ones
     */
    private buildSegments(
        paragraphs: string[],
        options: SegmentationOptions,
    ): TextSegment[] {
        const { targetTokens, minTokens, maxTokens } = options;
        const segments: TextSegment[] = [];

        let currentSegment = '';
        let segmentIndex = 0;

        for (const paragraph of paragraphs) {
            const paragraphTokens = this.estimateTokens(paragraph);
            const currentTokens = this.estimateTokens(currentSegment);

            // If paragraph alone exceeds max, split it
            if (paragraphTokens > maxTokens!) {
                // First, flush current segment if not empty
                if (currentSegment.trim()) {
                    segments.push(this.createSegment(currentSegment, segmentIndex++));
                    currentSegment = '';
                }

                // Split large paragraph into sentences
                const subSegments = this.splitLargeParagraph(paragraph, maxTokens!);
                for (const sub of subSegments) {
                    segments.push(this.createSegment(sub, segmentIndex++));
                }
                continue;
            }

            // If adding this paragraph would exceed target significantly
            if (currentTokens > 0 && currentTokens + paragraphTokens > targetTokens! * 1.5) {
                // Flush current segment
                segments.push(this.createSegment(currentSegment, segmentIndex++));
                currentSegment = paragraph;
            } else {
                // Merge with current segment
                currentSegment += (currentSegment ? '\n\n' : '') + paragraph;
            }

            // If current segment reached target, check if we should flush
            const newTokens = this.estimateTokens(currentSegment);
            if (newTokens >= targetTokens!) {
                segments.push(this.createSegment(currentSegment, segmentIndex++));
                currentSegment = '';
            }
        }

        // Flush remaining content
        if (currentSegment.trim()) {
            const remainingTokens = this.estimateTokens(currentSegment);

            // If too small and we have previous segments, merge with last
            if (remainingTokens < minTokens! && segments.length > 0) {
                const lastSegment = segments[segments.length - 1];
                const combinedText = lastSegment.text + '\n\n' + currentSegment;
                const combinedTokens = this.estimateTokens(combinedText);

                // Only merge if combined doesn't exceed max too much
                if (combinedTokens <= maxTokens! * 1.2) {
                    lastSegment.text = combinedText;
                    lastSegment.tokenCount = combinedTokens;
                } else {
                    segments.push(this.createSegment(currentSegment, segmentIndex++));
                }
            } else {
                segments.push(this.createSegment(currentSegment, segmentIndex++));
            }
        }

        return segments;
    }

    /**
     * Split a large paragraph at sentence boundaries
     */
    private splitLargeParagraph(paragraph: string, maxTokens: number): string[] {
        // Split at sentence boundaries
        const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
        const subSegments: string[] = [];
        let current = '';

        for (const sentence of sentences) {
            const sentenceTokens = this.estimateTokens(sentence);
            const currentTokens = this.estimateTokens(current);

            if (currentTokens + sentenceTokens > maxTokens && current) {
                subSegments.push(current.trim());
                current = sentence;
            } else {
                current += sentence;
            }
        }

        if (current.trim()) {
            subSegments.push(current.trim());
        }

        return subSegments;
    }

    /**
     * Create a segment object
     */
    private createSegment(text: string, index: number): TextSegment {
        return {
            text: text.trim(),
            tokenCount: this.estimateTokens(text),
            segmentIndex: index,
        };
    }

    /**
     * Attach page information to segments based on character positions
     */
    private attachPageInfo(
        segments: TextSegment[],
        fullText: string,
        pages: PageContent[],
    ): void {
        let charPosition = 0;

        for (const segment of segments) {
            // Find where this segment starts in the original text
            const segmentStart = fullText.indexOf(segment.text, charPosition);
            const segmentEnd = segmentStart + segment.text.length;

            if (segmentStart === -1) {
                // Segment not found (shouldn't happen but handle gracefully)
                continue;
            }

            // Find which pages this segment spans
            let pageStart: number | undefined;
            let pageEnd: number | undefined;

            for (const page of pages) {
                // Check if segment overlaps with this page
                if (segmentStart < page.endCharIndex && segmentEnd > page.startCharIndex) {
                    if (pageStart === undefined) {
                        pageStart = page.pageNumber;
                    }
                    pageEnd = page.pageNumber;
                }
            }

            segment.pageStart = pageStart;
            segment.pageEnd = pageEnd;
            charPosition = segmentEnd;
        }
    }

    /**
     * Detect and extract headings from segment text
     */
    private detectHeadings(segments: TextSegment[]): void {
        for (const segment of segments) {
            const lines = segment.text.split('\n');
            const firstLine = lines[0]?.trim() || '';

            // Heuristics for heading detection:
            // 1. Short first line (< 100 chars)
            // 2. Ends without punctuation or ends with ':'
            // 3. Followed by longer content
            const isShort = firstLine.length < 100;
            const noPunctuation = !/[.!?]$/.test(firstLine) || firstLine.endsWith(':');
            const hasMoreContent = lines.length > 1 || segment.text.length > firstLine.length + 50;

            if (isShort && noPunctuation && hasMoreContent && firstLine.length > 3) {
                segment.heading = firstLine;
            }
        }
    }
}

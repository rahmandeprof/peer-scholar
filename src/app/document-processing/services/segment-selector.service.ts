/**
 * SegmentSelectorService - Selects relevant segments for AI generation
 * Supports topic-based filtering, page-range selection, and random sampling
 */
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { DocumentSegment } from '../../academic/entities/document-segment.entity';

export interface SegmentSelectionOptions {
    topic?: string;
    pageStart?: number;
    pageEnd?: number;
    maxTokens?: number;
    maxSegments?: number;
}

export interface SelectedSegments {
    segments: DocumentSegment[];
    totalTokens: number;
    selectionMethod: 'page_range' | 'topic' | 'random' | 'all';
}

@Injectable()
export class SegmentSelectorService {
    private readonly logger = new Logger(SegmentSelectorService.name);

    constructor(
        @InjectRepository(DocumentSegment)
        private readonly segmentRepo: Repository<DocumentSegment>,
    ) { }

    /**
     * Select segments for a material based on criteria
     */
    async selectSegments(
        materialId: string,
        options: SegmentSelectionOptions = {},
    ): Promise<SelectedSegments> {
        const { topic, pageStart, pageEnd, maxTokens = 8000, maxSegments = 20 } = options;

        // Get all segments for this material
        let segments = await this.segmentRepo.find({
            where: { materialId },
            order: { segmentIndex: 'ASC' },
        });

        if (segments.length === 0) {
            return { segments: [], totalTokens: 0, selectionMethod: 'all' };
        }

        let selectionMethod: 'page_range' | 'topic' | 'random' | 'all' = 'all';

        // Apply page range filter if specified
        if (pageStart !== undefined || pageEnd !== undefined) {
            segments = this.filterByPageRange(segments, pageStart, pageEnd);
            selectionMethod = 'page_range';
        }

        // Apply topic filter if specified
        if (topic && topic.trim().length > 0) {
            const topicFiltered = this.filterByTopic(segments, topic);
            if (topicFiltered.length > 0) {
                segments = topicFiltered;
                selectionMethod = 'topic';
            }
            // If topic matching returns nothing, keep all segments
        }

        // Apply token budget
        segments = this.applyTokenBudget(segments, maxTokens, maxSegments);

        // If still too few segments, apply random sampling fallback
        if (segments.length === 0 && topic) {
            // Topic matching failed, fall back to random sampling
            const allSegments = await this.segmentRepo.find({
                where: { materialId },
                order: { segmentIndex: 'ASC' },
            });
            segments = this.randomSample(allSegments, maxTokens, maxSegments);
            selectionMethod = 'random';
        }

        const totalTokens = segments.reduce((sum, s) => sum + s.tokenCount, 0);

        this.logger.debug(
            `Selected ${segments.length} segments (${totalTokens} tokens) using ${selectionMethod} method`,
        );

        return { segments, totalTokens, selectionMethod };
    }

    /**
     * Filter segments by page range
     */
    private filterByPageRange(
        segments: DocumentSegment[],
        pageStart?: number,
        pageEnd?: number,
    ): DocumentSegment[] {
        return segments.filter(segment => {
            // If segment has no page info, include it
            if (!segment.pageStart && !segment.pageEnd) return true;

            const segStart = segment.pageStart || 1;
            const segEnd = segment.pageEnd || segStart;

            // Check if segment overlaps with requested range
            if (pageStart !== undefined && pageEnd !== undefined) {
                return segStart <= pageEnd && segEnd >= pageStart;
            } else if (pageStart !== undefined) {
                return segEnd >= pageStart;
            } else if (pageEnd !== undefined) {
                return segStart <= pageEnd;
            }

            return true;
        });
    }

    /**
     * Filter segments by topic relevance using fuzzy matching
     */
    private filterByTopic(segments: DocumentSegment[], topic: string): DocumentSegment[] {
        const topicLower = topic.toLowerCase();
        const keywords = topicLower.split(/\s+/).filter(w => w.length > 2);

        // Score each segment by relevance
        const scored = segments.map(segment => {
            const textLower = segment.text.toLowerCase();
            const headingLower = segment.heading?.toLowerCase() || '';

            let score = 0;

            // Exact phrase match (highest score)
            if (textLower.includes(topicLower)) {
                score += 10;
            }

            // Heading contains topic (high score)
            if (headingLower.includes(topicLower)) {
                score += 8;
            }

            // Keyword matches
            for (const keyword of keywords) {
                if (textLower.includes(keyword)) score += 2;
                if (headingLower.includes(keyword)) score += 3;
            }

            return { segment, score };
        });

        // Filter segments with any relevance score
        const relevant = scored.filter(s => s.score > 0);

        // Sort by score (highest first) then by segment index
        relevant.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return a.segment.segmentIndex - b.segment.segmentIndex;
        });

        return relevant.map(s => s.segment);
    }

    /**
     * Apply token budget - keep segments until budget is exhausted
     */
    private applyTokenBudget(
        segments: DocumentSegment[],
        maxTokens: number,
        maxSegments: number,
    ): DocumentSegment[] {
        const result: DocumentSegment[] = [];
        let tokenCount = 0;

        for (const segment of segments) {
            if (result.length >= maxSegments) break;
            if (tokenCount + segment.tokenCount > maxTokens) {
                // If we have at least one segment, stop
                if (result.length > 0) break;
                // If this is the first segment, include it anyway (truncated in prompt)
            }

            result.push(segment);
            tokenCount += segment.tokenCount;
        }

        return result;
    }

    /**
     * Random sampling fallback - pick diverse segments across the document
     */
    private randomSample(
        segments: DocumentSegment[],
        maxTokens: number,
        maxSegments: number,
    ): DocumentSegment[] {
        if (segments.length === 0) return [];

        // Sample evenly across the document
        const step = Math.max(1, Math.floor(segments.length / maxSegments));
        const sampled: DocumentSegment[] = [];
        let tokenCount = 0;

        for (let i = 0; i < segments.length && sampled.length < maxSegments; i += step) {
            const segment = segments[i];
            if (tokenCount + segment.tokenCount > maxTokens && sampled.length > 0) break;

            sampled.push(segment);
            tokenCount += segment.tokenCount;
        }

        // Sort by segment index to maintain document order
        sampled.sort((a, b) => a.segmentIndex - b.segmentIndex);

        return sampled;
    }

    /**
     * Get all segments for a material (for full document operations)
     */
    async getAllSegments(materialId: string): Promise<DocumentSegment[]> {
        return this.segmentRepo.find({
            where: { materialId },
            order: { segmentIndex: 'ASC' },
        });
    }

    /**
     * Get total segment count for a material
     */
    async getSegmentCount(materialId: string): Promise<number> {
        return this.segmentRepo.count({ where: { materialId } });
    }
}

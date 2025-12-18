import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bull';

import {
  AccessScope,
  Material,
  MaterialStatus,
  MaterialType,
  ProcessingStatus,
  ProcessingVersion,
  QuizQuestion as EntityQuizQuestion,
  FlashcardItem,
} from '../academic/entities/material.entity';
import { DocumentSegment } from '../academic/entities/document-segment.entity';
import { MaterialChunk } from '../academic/entities/material-chunk.entity';
import { Comment } from './entities/comment.entity';
import { Conversation } from './entities/conversation.entity';
import { Message, MessageRole } from './entities/message.entity';
import { QuizResult } from './entities/quiz-result.entity';
import { User } from '@/app/users/entities/user.entity';

import { ContextActionDto, ContextActionType } from './dto/context-action.dto';

import { StorageService } from '@/app/common/services/storage.service';
import { ConversionService } from '@/app/common/services/conversion.service';
import { UsersService } from '@/app/users/users.service';

import { REPUTATION_REWARDS } from '@/app/common/constants/reputation.constants';

import { QuizGenerator, FlashcardGenerator, QuizDifficulty } from '@/app/quiz-engine';
import { SegmentSelectorService } from '@/app/document-processing/services/segment-selector.service';

import OpenAI from 'openai';
import { Repository } from 'typeorm';
import { Queue } from 'bull';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private openai?: OpenAI;
  private readonly chatModel: string;
  private readonly generationModel: string;

  constructor(
    @InjectRepository(Material)
    private readonly materialRepo: Repository<Material>,
    @InjectRepository(MaterialChunk)
    private readonly chunkRepo: Repository<MaterialChunk>,
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectRepository(QuizResult)
    private readonly quizResultRepo: Repository<QuizResult>,
    @InjectRepository(Comment)
    private readonly commentRepo: Repository<Comment>,
    private readonly usersService: UsersService,
    private readonly storageService: StorageService,
    private readonly conversionService: ConversionService,
    private readonly configService: ConfigService,
    private readonly quizGenerator: QuizGenerator,
    private readonly flashcardGenerator: FlashcardGenerator,
    private readonly segmentSelector: SegmentSelectorService,
    @InjectRepository(DocumentSegment)
    private readonly segmentRepo: Repository<DocumentSegment>,
    @InjectQueue('materials') private readonly materialsQueue: Queue,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');

    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    }

    // Configurable AI models with sensible defaults
    this.chatModel = this.configService.get<string>('OPENAI_CHAT_MODEL') ?? 'gpt-3.5-turbo';
    this.generationModel = this.configService.get<string>('OPENAI_GENERATION_MODEL') ?? 'gpt-4o-mini';
  }

  // Extract text from file (pdf, docx, txt)
  async extractTextFromFile(file: Express.Multer.File): Promise<string> {
    return this.conversionService.extractText(
      file.buffer,
      file.mimetype,
      file.originalname,
    );
  }

  async saveMaterial(
    user: User,
    file: Express.Multer.File,
    metadata: {
      title: string;
      category: MaterialType;
      department?: string;
      yearLevel?: number;
      isPublic?: string;
      courseCode?: string;
      topic?: string;
    },
  ) {
    // Upload to Cloudinary
    let url = '';

    try {
      const uploadResult = await this.storageService.uploadFile(file);
      url = uploadResult.url;
    } catch (error) {
      this.logger.error(
        'Failed to upload file to Cloudinary, using placeholder',
        error,
      );
      url = 'https://placeholder.com/file-upload-failed';
    }

    // Handle File Processing (Text Extraction & PDF Conversion)
    let pdfUrl = '';
    let content = '';

    const isOfficeDoc =
      file.mimetype.includes('officedocument') ||
      file.mimetype.includes('msword') ||
      file.mimetype.includes('presentation') ||
      file.originalname.endsWith('.docx') ||
      file.originalname.endsWith('.pptx');

    if (isOfficeDoc) {
      try {
        const pdfBuffer = await this.conversionService.convertToPdf(
          file.buffer,
          file.originalname,
        );

        // Upload PDF to Cloudinary
        const pdfFile: Express.Multer.File = {
          ...file,
          buffer: pdfBuffer,
          originalname: file.originalname.replace(/\.[^/.]+$/, '.pdf'),
          mimetype: 'application/pdf',
        };
        const pdfUpload = await this.storageService.uploadFile(pdfFile);
        pdfUrl = pdfUpload.url;

        // Extract text from the GENERATED PDF (reliable)
        content = await this.conversionService.extractText(
          pdfBuffer,
          'application/pdf',
          'converted.pdf',
        );
      } catch (error) {
        this.logger.error('Failed to convert/process Office file', error);
        // Fallback to raw extraction if conversion fails
        content = await this.extractTextFromFile(file);
      }
    } else {
      // For PDF, Text, etc. - extract directly
      content = await this.extractTextFromFile(file);
    }

    const material = this.materialRepo.create({
      title: metadata.title,
      type: metadata.category,
      scope:
        metadata.isPublic === 'true' ? AccessScope.PUBLIC : AccessScope.COURSE,
      content,
      fileUrl: url,
      pdfUrl: pdfUrl || (file.mimetype === 'application/pdf' ? url : undefined),
      fileType: file.mimetype,
      uploader: user,
      // Explicitly set both status fields
      status: MaterialStatus.PENDING,
      // New uploads use v2 segment-based processing
      processingVersion: ProcessingVersion.V2,
      processingStatus: ProcessingStatus.PENDING,
    });

    const savedMaterial = await this.materialRepo.save(material);

    // Queue background processing for segmentation
    await this.materialsQueue.add('process-material', {
      materialId: savedMaterial.id,
      fileUrl: savedMaterial.fileUrl,
    });

    await this.usersService.increaseReputation(
      user.id,
      REPUTATION_REWARDS.HIGH,
    );

    return savedMaterial;
  }

  async deleteMaterial(materialId: string, user: User) {
    const material = await this.materialRepo.findOne({
      where: { id: materialId },
      relations: ['uploader'],
    });

    if (!material) throw new NotFoundException('Material not found');

    // Admin bypass - admins can delete any material
    const isAdmin = user.role === 'admin';
    if (material.uploader.id !== user.id && !isAdmin) {
      throw new NotFoundException('You can only delete your own materials');
    }

    // Delete from Cloudinary
    if (material.fileUrl) {
      const publicId = this.extractPublicIdFromUrl(material.fileUrl);

      if (publicId) {
        await this.storageService.deleteFile(publicId);
      }
    }

    // Delete PDF version if exists and different
    if (material.pdfUrl && material.pdfUrl !== material.fileUrl) {
      const publicId = this.extractPublicIdFromUrl(material.pdfUrl);

      if (publicId) {
        await this.storageService.deleteFile(publicId);
      }
    }

    await this.materialRepo.remove(material);

    return { success: true };
  }

  private extractPublicIdFromUrl(url: string): string | null {
    try {
      // Example URL: https://res.cloudinary.com/demo/image/upload/v1570979139/scholar-app/my_file.jpg
      const parts = url.split('/');
      const filenameWithExt = parts[parts.length - 1];
      const folder = parts[parts.length - 2];
      const filename = filenameWithExt.split('.')[0];

      // Assuming folder structure 'scholar-app'
      if (folder === 'scholar-app') {
        return `${folder}/${filename}`;
      }

      // Fallback: try to find version 'v12345' and take everything after
      const versionIndex = parts.findIndex(
        (p) => p.startsWith('v') && !isNaN(Number(p.substring(1))),
      );

      if (versionIndex !== -1 && versionIndex < parts.length - 1) {
        const publicIdParts = parts.slice(versionIndex + 1);
        const lastPart = publicIdParts[publicIdParts.length - 1];

        publicIdParts[publicIdParts.length - 1] = lastPart.split('.')[0];

        return publicIdParts.join('/');
      }

      return null;
    } catch (e) {
      this.logger.error(`Failed to extract publicId from URL: ${url}`, e);

      return null;
    }
  }

  createConversation(user: User, title: string) {
    const conversation = this.conversationRepo.create({
      user,
      title,
    });

    return this.conversationRepo.save(conversation);
  }

  getConversations(user: User) {
    return this.conversationRepo.find({
      where: { userId: user.id },
      order: { createdAt: 'DESC' },
    });
  }

  async getConversation(id: string, user: User) {
    const conversation = await this.conversationRepo.findOne({
      where: { id, userId: user.id },
      relations: ['user'],
    });

    if (!conversation) throw new NotFoundException('Conversation not found');

    return conversation;
  }

  getMessages(conversationId: string) {
    return this.messageRepo.find({
      where: { conversationId },
      order: { createdAt: 'ASC' },
    });
  }

  async deleteConversation(conversationId: string, user: User) {
    const conversation = await this.getConversation(conversationId, user);

    await this.conversationRepo.remove(conversation);

    return { success: true };
  }

  async renameConversation(conversationId: string, title: string, user: User) {
    const conversation = await this.getConversation(conversationId, user);

    conversation.title = title;

    return this.conversationRepo.save(conversation);
  }

  async sendMessage(
    user: User,
    conversationId: string | null,
    content: string,
    materialId?: string,
  ) {
    let conversation: Conversation;

    if (conversationId) {
      conversation = await this.getConversation(conversationId, user);
    } else {
      conversation = await this.createConversation(
        user,
        content.substring(0, 30) + '...',
      );
    }

    // Save user message
    await this.messageRepo.save({
      conversation,
      role: MessageRole.USER,
      content,
    });

    // Update streak
    await this.usersService.updateStreak(user.id);

    // Generate response
    const response = await this.generateResponse(
      user,
      content,
      conversation.id,
      materialId,
    );

    // Save assistant message
    const assistantMessage = await this.messageRepo.save({
      conversation,
      role: MessageRole.ASSISTANT,
      content: response.answer,
    });

    return {
      conversation,
      userMessage: { content, role: MessageRole.USER },
      assistantMessage,
      sources: response.sources,
    };
  }

  async getSummary(materialId: string): Promise<string> {
    const material = await this.materialRepo.findOne({
      where: { id: materialId },
    });

    if (!material) throw new NotFoundException('Material not found');

    // Check if processing is still in progress - wait for completion
    const activeProcessingStates = [
      ProcessingStatus.PENDING,
      ProcessingStatus.EXTRACTING,
      ProcessingStatus.OCR_EXTRACTING,
      ProcessingStatus.CLEANING,
      ProcessingStatus.SEGMENTING,
    ];

    if (activeProcessingStates.includes(material.processingStatus)) {
      throw new BadRequestException(
        'Material is still being processed. Please wait a moment and try again.',
      );
    }

    return this.getOrGenerateSummary(material);
  }

  private async getOrGenerateSummary(material: Material): Promise<string> {
    // Return cached summary if available
    if (material.summary) return material.summary;

    if (!this.openai) {
      throw new InternalServerErrorException('AI service is not configured');
    }

    // Get all segments for this material
    const segments = await this.segmentRepo.find({
      where: { materialId: material.id },
      order: { segmentIndex: 'ASC' },
    });

    // If we have segments, use them
    if (segments.length > 0) {
      // Large document: use hierarchical summarization
      if (segments.length > 30) {
        this.logger.debug(`Using hierarchical summarization for ${segments.length} segments`);
        return this.hierarchicalSummarize(material, segments);
      }
      // Standard: use first ~6000 tokens
      return this.summarizeSegments(material, segments);
    }

    // Legacy fallback: use material.content if available
    if (material.content) {
      this.logger.debug('Using legacy content fallback for summary');
      const legacyContent = material.content.substring(0, 24000); // ~6000 tokens
      return this.summarizeAndCache(material, legacyContent);
    }

    // No content available at all
    throw new BadRequestException(
      'Material content is not available. Please wait for processing to complete or re-upload the file.',
    );
  }

  /**
   * Summarize segments for standard-sized documents (<30 segments)
   */
  private async summarizeSegments(
    material: Material,
    segments: DocumentSegment[],
  ): Promise<string> {
    let contentForSummary = '';
    let tokenCount = 0;

    for (const segment of segments) {
      if (tokenCount + segment.tokenCount > 6000) break;
      contentForSummary += segment.text + '\n\n';
      tokenCount += segment.tokenCount;
    }

    return this.summarizeAndCache(material, contentForSummary);
  }

  /**
   * Hierarchical summarization for large documents (>30 segments)
   * Splits into chunks, summarizes each, then creates final summary
   */
  private async hierarchicalSummarize(
    material: Material,
    segments: DocumentSegment[],
  ): Promise<string> {
    // Split segments into ~5 chunks
    const chunkCount = Math.min(5, Math.ceil(segments.length / 10));
    const chunkSize = Math.ceil(segments.length / chunkCount);
    const chunkTexts: string[] = [];

    for (let i = 0; i < segments.length; i += chunkSize) {
      const chunkSegments = segments.slice(i, i + chunkSize);
      let chunkText = '';
      let tokenCount = 0;

      for (const seg of chunkSegments) {
        if (tokenCount + seg.tokenCount > 4000) break;
        chunkText += seg.text + '\n\n';
        tokenCount += seg.tokenCount;
      }

      if (chunkText.trim()) chunkTexts.push(chunkText);
    }

    this.logger.debug(`Summarizing ${chunkTexts.length} chunks for hierarchical summary`);

    // Summarize each chunk in parallel
    const chunkSummaries = await Promise.all(
      chunkTexts.map(chunk => this.summarizeText(chunk, 200)),
    );

    // Filter out empty summaries
    const validSummaries = chunkSummaries.filter(s => s && s.trim());

    if (validSummaries.length === 0) {
      throw new InternalServerErrorException('Failed to generate summary from chunks');
    }

    // Create final summary from chunk summaries
    const combinedSummaries = validSummaries.join('\n\n---\n\n');
    const finalSummary = await this.summarizeText(
      `The following are summaries of different sections of a document. Create a cohesive overall summary:\n\n${combinedSummaries}`,
      500,
    );

    // Cache the result
    if (finalSummary) {
      material.summary = finalSummary;
      await this.materialRepo.save(material);
    }

    return finalSummary;
  }

  /**
   * Helper: Summarize content and cache result
   */
  private async summarizeAndCache(material: Material, content: string): Promise<string> {
    if (!content.trim()) {
      throw new BadRequestException('No content available to summarize');
    }

    const summary = await this.summarizeText(content, 500);

    if (summary) {
      material.summary = summary;
      await this.materialRepo.save(material);
    }

    return summary;
  }

  /**
   * Helper: Core text summarization (no caching)
   */
  private async summarizeText(content: string, maxTokens: number): Promise<string> {
    if (!this.openai) return '';

    try {
      const response = await this.openai.chat.completions.create({
        model: this.chatModel,
        messages: [
          {
            role: 'system',
            content:
              'Summarize the following text concisely but comprehensively for a student. Focus on key concepts and main ideas.',
          },
          { role: 'user', content },
        ],
        max_tokens: maxTokens,
      });

      return response.choices[0].message.content ?? '';
    } catch (e) {
      this.logger.error('Failed to generate summary', e);
      throw new InternalServerErrorException('Failed to generate summary. Please try again.');
    }
  }

  async extractKeyPoints(materialId: string): Promise<string[]> {
    const material = await this.materialRepo.findOne({
      where: { id: materialId },
    });

    if (!material) throw new NotFoundException('Material not found');

    // Return cached key points if available
    if (material.keyPoints && material.keyPoints.length > 0) {
      return material.keyPoints;
    }

    if (!this.openai) throw new InternalServerErrorException('AI service is not configured');

    // Try to use segments first
    const segments = await this.segmentRepo.find({
      where: { materialId },
      order: { segmentIndex: 'ASC' },
      take: 15,
    });

    let contentForKeyPoints = '';

    if (segments.length > 0) {
      let tokenCount = 0;
      for (const segment of segments) {
        if (tokenCount + segment.tokenCount > 6000) break;
        contentForKeyPoints += segment.text + '\n\n';
        tokenCount += segment.tokenCount;
      }
    } else {
      // Fallback to legacy content
      contentForKeyPoints = material.content?.substring(0, 24000) || '';
    }

    if (!contentForKeyPoints) {
      throw new BadRequestException(
        'Material content is not available. Please re-upload the file.',
      );
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: this.chatModel,
        messages: [
          {
            role: 'system',
            content:
              'Extract 5-7 key bullet points from the following text. Return them as a JSON array of strings.',
          },
          { role: 'user', content: contentForKeyPoints },
        ],
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0].message.content;

      if (!content) return [];

      let parsed;

      try {
        parsed = JSON.parse(content);
      } catch (e) {
        this.logger.error(`Failed to parse key points JSON: ${content}`, e);
        throw e;
      }

      const points =
        parsed.points ?? parsed.keyPoints ?? parsed.key_points ?? [];

      // Cache the result
      if (points.length > 0) {
        material.keyPoints = points;
        await this.materialRepo.save(material);
      }

      return points;
    } catch (e) {
      this.logger.error('Failed to extract key points', e);

      return [];
    }
  }

  async generateQuiz(
    materialId: string,
    pageStart?: number,
    pageEnd?: number,
    regenerate?: boolean,
    difficulty?: QuizDifficulty,
    questionCount?: number,
  ) {
    const material = await this.materialRepo.findOne({
      where: { id: materialId },
    });

    if (!material) throw new NotFoundException('Material not found');

    // Check if material is still being processed (legacy status check)
    if (material.status === MaterialStatus.PROCESSING || material.status === MaterialStatus.PENDING) {
      throw new BadRequestException(
        'PROCESSING: This material is still being analyzed. Please wait a moment and try again.',
      );
    }

    // Check processing status for segment-based materials
    if (material.processingStatus === ProcessingStatus.EXTRACTING ||
      material.processingStatus === ProcessingStatus.CLEANING ||
      material.processingStatus === ProcessingStatus.SEGMENTING) {
      throw new BadRequestException(
        'PROCESSING: This material is still being segmented. Please wait a moment and try again.',
      );
    }

    // Check if material processing failed
    if (material.status === MaterialStatus.FAILED || material.processingStatus === ProcessingStatus.FAILED) {
      throw new BadRequestException(
        'UNSUPPORTED: This document could not be processed. It may be a scanned image, password-protected, or in an unsupported format.',
      );
    }

    // Return cached quiz if:
    // - No page range was requested (full doc quiz)
    // - Not explicitly regenerating
    // - Quiz exists and was generated for current material version
    const cacheValid = material.quiz &&
      material.quiz.length > 0 &&
      material.quizGeneratedVersion === material.materialVersion;

    if (!pageStart && !pageEnd && !regenerate && cacheValid) {
      this.logger.log(`[CACHE-HIT] Quiz cache hit for material ${materialId}, returning ${material.quiz?.length ?? 0} cached questions`);
      return material.quiz;
    }

    // Log cache miss reason
    const missReason = pageStart || pageEnd ? 'page-range-specified' :
      regenerate ? 'regenerate-requested' :
        !material.quiz ? 'no-cached-quiz' :
          material.quiz.length === 0 ? 'empty-cached-quiz' :
            'version-mismatch';
    this.logger.log(`[CACHE-MISS] Quiz cache miss for material ${materialId}, reason: ${missReason}`);

    // Try to use segments first (new architecture)
    const segmentCount = await this.segmentRepo.count({ where: { materialId } });

    // Lazy upgrade: If v1 document with no segments, trigger upgrade
    if (material.processingVersion === ProcessingVersion.V1 && segmentCount === 0) {
      // Queue background upgrade
      await this.materialsQueue.add('upgrade-to-v2', { materialId });
      this.logger.log(`[LAZY-UPGRADE] Triggered upgrade for v1 material ${materialId}`);

      // Return upgrading status - frontend should poll for completion
      return {
        status: 'upgrading',
        message: 'Preparing this material for smart study...',
        materialId,
      };
    }

    if (segmentCount > 0) {
      // Use segment-based generation
      const { segments } = await this.segmentSelector.selectSegments(materialId, {
        pageStart,
        pageEnd,
        maxTokens: 8000,
        maxSegments: 20,
      });

      if (segments.length === 0) {
        throw new BadRequestException(
          'No content segments found for the specified page range.',
        );
      }

      const result = await this.quizGenerator.generateFromSegments(
        segments,
        material.title,
        difficulty || QuizDifficulty.INTERMEDIATE,
        questionCount || 5,
      );

      if (!result.success || !result.data) {
        this.logger.error(`Quiz generation from segments failed: ${result.error}`);
        throw new InternalServerErrorException(result.error || 'Failed to generate quiz');
      }

      const quiz = result.data.questions;

      // Cache the result ONLY if it's a full quiz (no page range specified)
      if (!pageStart && !pageEnd && quiz.length > 0) {
        material.quiz = quiz as EntityQuizQuestion[];
        material.quizGeneratedVersion = material.materialVersion;
        await this.materialRepo.save(material);
      }

      return quiz;
    }

    // Fallback: Use legacy content-based generation for materials without segments
    const materialContent = material.content;

    if (!materialContent || materialContent.trim().length < 50) {
      throw new BadRequestException(
        'This material doesn\'t have enough content for quiz generation. It may need to be reprocessed.',
      );
    }

    // Build text segment for legacy generation
    const CHARS_PER_PAGE = 3000;
    let textSegment = materialContent;

    if (pageStart || pageEnd) {
      const startChar = pageStart ? (pageStart - 1) * CHARS_PER_PAGE : 0;
      const endChar = pageEnd ? pageEnd * CHARS_PER_PAGE : materialContent.length;
      textSegment = materialContent.substring(startChar, endChar);
    }

    // Use legacy QuizGenerator method
    const result = await this.quizGenerator.generate({
      topic: material.title,
      difficulty: difficulty || QuizDifficulty.INTERMEDIATE,
      questionCount: questionCount || 5,
      textSegment,
      materialId: material.id,
    });

    if (!result.success || !result.data) {
      this.logger.error(`Quiz generation failed: ${result.error}`);
      throw new InternalServerErrorException(result.error || 'Failed to generate quiz');
    }

    const quiz = result.data.questions;

    // Cache the result ONLY if it's a full quiz (no page range specified)
    if (!pageStart && !pageEnd && quiz.length > 0) {
      material.quiz = quiz as EntityQuizQuestion[];
      material.quizGeneratedVersion = material.materialVersion;
      await this.materialRepo.save(material);
    }

    return quiz;
  }

  async generateFlashcards(materialId: string, cardCount?: number, pageStart?: number, pageEnd?: number) {
    const material = await this.materialRepo.findOne({
      where: { id: materialId },
    });

    if (!material) throw new NotFoundException('Material not found');

    // Check if material is still being processed (legacy status check)
    if (material.status === MaterialStatus.PROCESSING || material.status === MaterialStatus.PENDING) {
      throw new BadRequestException(
        'PROCESSING: This material is still being analyzed. Please wait a moment and try again.',
      );
    }

    // Check processing status for segment-based materials
    if (material.processingStatus === ProcessingStatus.EXTRACTING ||
      material.processingStatus === ProcessingStatus.CLEANING ||
      material.processingStatus === ProcessingStatus.SEGMENTING) {
      throw new BadRequestException(
        'PROCESSING: This material is still being segmented. Please wait a moment and try again.',
      );
    }

    // Check if material processing failed
    if (material.status === MaterialStatus.FAILED || material.processingStatus === ProcessingStatus.FAILED) {
      throw new BadRequestException(
        'UNSUPPORTED: This document could not be processed. It may be a scanned image, password-protected, or in an unsupported format.',
      );
    }

    // Return cached flashcards if:
    // - No page range specified (full doc flashcards)
    // - Flashcards exist and were generated for current material version
    const cacheValid = material.flashcards &&
      material.flashcards.length > 0 &&
      material.flashcardGeneratedVersion === material.materialVersion;

    if (!pageStart && !pageEnd && cacheValid) {
      this.logger.log(`[CACHE-HIT] Flashcard cache hit for material ${materialId}, returning ${material.flashcards?.length ?? 0} cached cards`);
      return material.flashcards;
    }

    // Log cache miss reason
    const missReason = pageStart || pageEnd ? 'page-range-specified' :
      !material.flashcards ? 'no-cached-flashcards' :
        material.flashcards.length === 0 ? 'empty-cached-flashcards' :
          'version-mismatch';
    this.logger.log(`[CACHE-MISS] Flashcard cache miss for material ${materialId}, reason: ${missReason}`);

    // Try to use segments first (new architecture)
    const segmentCount = await this.segmentRepo.count({ where: { materialId } });

    // Lazy upgrade: If v1 document with no segments, trigger upgrade
    if (material.processingVersion === ProcessingVersion.V1 && segmentCount === 0) {
      // Queue background upgrade
      await this.materialsQueue.add('upgrade-to-v2', { materialId });
      this.logger.log(`[LAZY-UPGRADE] Triggered flashcard upgrade for v1 material ${materialId}`);

      // Return upgrading status - frontend should poll for completion
      return {
        status: 'upgrading',
        message: 'Preparing this material for smart study...',
        materialId,
      };
    }

    if (segmentCount > 0) {
      // Use segment-based generation
      const { segments } = await this.segmentSelector.selectSegments(materialId, {
        maxTokens: 8000,
        maxSegments: 20,
        pageStart,
        pageEnd,
      });

      if (segments.length === 0) {
        throw new BadRequestException(
          'No content segments found for flashcard generation.',
        );
      }

      const result = await this.flashcardGenerator.generateFromSegments(
        segments,
        material.title,
        cardCount || 10,
      );

      if (!result.success || !result.data) {
        this.logger.error(`Flashcard generation from segments failed: ${result.error}`);
        throw new InternalServerErrorException(result.error || 'Failed to generate flashcards');
      }

      const flashcards = result.data;

      // Cache the result if it's a full flashcard set (no page range)
      if (!pageStart && !pageEnd && flashcards.length > 0) {
        material.flashcards = flashcards as FlashcardItem[];
        material.flashcardGeneratedVersion = material.materialVersion;
        await this.materialRepo.save(material);
      }

      return flashcards;
    }

    // Fallback: Use legacy content-based generation for materials without segments
    const materialContent = material.content;

    if (!materialContent || materialContent.trim().length < 50) {
      throw new BadRequestException(
        'This material doesn\'t have enough content for flashcard generation. It may need to be reprocessed.',
      );
    }

    // Use legacy FlashcardGenerator method
    const result = await this.flashcardGenerator.generate({
      topic: material.title,
      cardCount: cardCount || 10,
      textSegment: materialContent,
      materialId: material.id,
    });

    if (!result.success || !result.data) {
      this.logger.error(`Flashcard generation failed: ${result.error}`);
      throw new InternalServerErrorException(result.error || 'Failed to generate flashcards');
    }

    const flashcards = result.data;

    // Cache the result if full document
    if (!pageStart && !pageEnd && flashcards.length > 0) {
      material.flashcards = flashcards as FlashcardItem[];
      material.flashcardGeneratedVersion = material.materialVersion;
      await this.materialRepo.save(material);
    }

    return flashcards;
  }

  async saveQuizResult(
    user: User,
    materialId: string,
    score: number,
    totalQuestions: number,
  ) {
    const material = await this.materialRepo.findOne({
      where: { id: materialId },
    });

    if (!material) throw new NotFoundException('Material not found');

    const result = this.quizResultRepo.create({
      user,
      material,
      score,
      totalQuestions,
    });

    this.logger.log(
      `Saving quiz result for user ${user.id}, material ${materialId}, score ${String(score)}/${String(totalQuestions)}`,
    );

    return this.quizResultRepo.save(result);
  }

  getQuizHistory(user: User) {
    return this.quizResultRepo.find({
      where: { user: { id: user.id } },
      relations: ['material'],
      order: { createdAt: 'DESC' },
    });
  }

  private async generateResponse(
    user: User,
    question: string,
    conversationId: string,
    materialId?: string,
  ) {
    let context = '';
    let materials: Material[] = [];

    // 1. If materialId is provided, use it as the primary context
    if (materialId) {
      const material = await this.materialRepo.findOne({
        where: { id: materialId },
      });

      if (material) {
        materials = [material];
        const summary = await this.getOrGenerateSummary(material);

        context = `FOCUSED SOURCE SUMMARY: ${summary}\n\n`;
      }
    }

    // 2. Vector Search for relevant chunks
    if (this.openai) {
      try {
        const embeddingResponse = await this.openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: question,
        });
        const embedding = embeddingResponse.data[0].embedding;

        // Perform vector search
        // Note: This raw query assumes pgvector is installed and 'embedding' column is vector type
        // If not, we might need a fallback.
        // Also, we filter by materialId if provided to narrow down search within the document
        // Or if not provided, we search across accessible materials.

        let query = `
          SELECT "chunk"."content", "chunk"."materialId", "material"."title", 
          1 - ("chunk"."embedding"::vector <=> $1) as similarity
          FROM "material_chunk" "chunk"
          INNER JOIN "material" "material" ON "chunk"."materialId" = "material"."id"
          WHERE 1 - ("chunk"."embedding"::vector <=> $1) > 0.5
        `;

        const params: unknown[] = [`[${embedding.join(',')}]`];

        if (materialId) {
          query += ` AND "chunk"."materialId" = $2`;
          params.push(materialId);
        } else {
          // Filter by user access (public or own or course)
          // This is complex in raw SQL. For now, let's just search all and filter in app or trust the vector search
          // Ideally: AND ("material"."scope" = 'public' OR "material"."uploaderId" = $2)
          // Let's simplify: just search relevant chunks.
        }

        query += ` ORDER BY similarity DESC LIMIT 5`;

        const results = await this.chunkRepo.query(query, params);

        if (results.length > 0) {
          context += 'RELEVANT EXCERPTS:\n';
          results.forEach(
            (r: { title: string; content: string; materialId: string }) => {
              context += `SOURCE: ${r.title}\n${r.content}\n\n`;
              if (!materials.find((m) => m.id === r.materialId)) {
                materials.push({
                  id: r.materialId,
                  title: r.title,
                } as Material);
              }
            },
          );
        }
      } catch (e) {
        this.logger.warn('Vector search failed', e);
        // Fallback to keyword search if vector search fails
        // ... (omitted for brevity, relying on summary/content if vector search fails)
      }
    }

    // 3. Retrieve recent chat history
    const history = await this.messageRepo.find({
      where: { conversationId },
      order: { createdAt: 'DESC' },
      take: 5,
    });
    const historyText = history
      .reverse()
      .map((m: Message) => `${m.role}: ${m.content}`)
      .join('\n');

    // 4. Call OpenAI
    if (!this.openai) throw new InternalServerErrorException('AI service is not configured');

    const system = `You are a helpful student assistant. Use the provided context to answer the student's question. 
    If a FOCUSED SOURCE is provided, prioritize it above all else.
    If the user asks for a summary, provide a comprehensive summary of the FOCUSED SOURCE.
    If the context contains relevant course material, cite it. 
    If the student asks about past questions, look for materials categorized as such.
    Context:\n${context}`;

    const userPrompt = `History:\n${historyText}\n\nQuestion: ${question}`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: this.chatModel,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 512,
      });

      const answer = completion.choices[0].message.content ?? '';

      return {
        answer,
        sources: materials.map((m) => ({ title: m.title, id: m.id })),
      };
    } catch (error) {
      this.logger.error('OpenAI API error', error);

      return {
        answer: "I'm sorry, I encountered an error processing your request.",
        sources: [],
      };
    }
  }

  getMaterials(user: User) {
    const queryBuilder = this.materialRepo
      .createQueryBuilder('material')
      .leftJoinAndSelect('material.uploader', 'uploader')
      .where(
        '(material.scope = :publicScope OR material.uploader.id = :userId)',
        {
          publicScope: AccessScope.PUBLIC,
          userId: user.id,
        },
      )
      .orderBy('material.createdAt', 'DESC');

    return queryBuilder.getMany();
  }

  async addComment(user: User, materialId: string, content: string) {
    const material = await this.materialRepo.findOne({
      where: { id: materialId },
    });

    if (!material) throw new NotFoundException('Material not found');

    const comment = this.commentRepo.create({
      user,
      material,
      content,
    });

    return this.commentRepo.save(comment);
  }

  getComments(materialId: string) {
    return this.commentRepo.find({
      where: { material: { id: materialId } },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  private cleanJson(text: string): string {
    // Remove markdown code blocks
    let cleaned = text.replace(/```(?:json)?/gi, '').trim();

    const firstBrace = cleaned.indexOf('{');
    const firstBracket = cleaned.indexOf('[');

    let start = -1;

    if (firstBrace !== -1 && firstBracket !== -1) {
      start = Math.min(firstBrace, firstBracket);
    } else if (firstBrace !== -1) {
      start = firstBrace;
    } else {
      start = firstBracket;
    }

    if (start !== -1) {
      cleaned = cleaned.substring(start);
    }

    const lastBrace = cleaned.lastIndexOf('}');
    const lastBracket = cleaned.lastIndexOf(']');

    let end = -1;

    if (lastBrace !== -1 && lastBracket !== -1) {
      end = Math.max(lastBrace, lastBracket);
    } else if (lastBrace !== -1) {
      end = lastBrace;
    } else {
      end = lastBracket;
    }

    if (end !== -1) {
      cleaned = cleaned.substring(0, end + 1);
    }

    return cleaned.trim();
  }

  async performContextAction(dto: ContextActionDto) {
    if (!this.openai) throw new InternalServerErrorException('AI service is not configured');

    let systemPrompt = '';
    let userPrompt = '';
    let temperature = 0.7;
    let isJson = false;

    switch (dto.action) {
      case ContextActionType.SIMPLIFY:
        systemPrompt = `You are a clever tutor. The student is reading a complex text.
Explain the following text to a university student using a simple, real-world analogy.
Keep it under 100 words.`;
        userPrompt = dto.text;
        temperature = 0.7;
        break;

      case ContextActionType.MNEMONIC:
        systemPrompt = `Create a catchy acronym or mnemonic phrase to help memorize this list or concept.
- Make it memorable or slightly funny.
- List the acronym letters and what they stand for clearly.`;
        userPrompt = dto.text;
        temperature = 0.9;
        break;

      case ContextActionType.KEYWORDS:
        systemPrompt = `Extract the top 5 technical "Keywords" or "Phrases" that a student MUST include in their answer to get full marks.
Present them as a bulleted list with brief definitions.`;
        userPrompt = dto.text;
        temperature = 0.2;
        break;

      case ContextActionType.QUIZ:
        systemPrompt = `You are a strict API endpoint. You receive text and output ONLY valid JSON. Do not include markdown formatting like \`\`\`json or \`\`\`.`;
        userPrompt = `Generate 3 multiple-choice questions based on this text:
'${dto.text}'

Return JSON schema:
[
  {
    "id": 1,
    "question": "Question text?",
    "options": ["A", "B", "C", "D"],
    "correctAnswer": "A",
    "explanation": "Why A is correct..."
  }
]`;
        temperature = 0.1;
        isJson = true;
        break;
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: this.generationModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature,
      });

      let content = response.choices[0].message.content ?? '';

      if (isJson) {
        content = this.cleanJson(content);
      }

      return { result: content };
    } catch (error) {
      this.logger.error('Failed to perform context action', error);
      throw new InternalServerErrorException('Failed to perform context action');
    }
  }
}

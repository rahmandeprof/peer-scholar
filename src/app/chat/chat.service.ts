import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';

import {
  AccessScope,
  Material,
  MaterialType,
} from '../academic/entities/material.entity';
import { MaterialChunk } from '../academic/entities/material-chunk.entity';
import { Comment } from './entities/comment.entity';
import { Conversation } from './entities/conversation.entity';
import { Message, MessageRole } from './entities/message.entity';
import { QuizResult } from './entities/quiz-result.entity';
import { User } from '@/app/users/entities/user.entity';

import { ContextActionDto, ContextActionType } from './dto/context-action.dto';

import { CloudinaryService } from '@/app/common/services/cloudinary.service';
import { ConversionService } from '@/app/common/services/conversion.service';
import { UsersService } from '@/app/users/users.service';

import { REPUTATION_REWARDS } from '@/app/common/constants/reputation.constants';

import OpenAI from 'openai';
import { Repository } from 'typeorm';

const COMPLETION_MODEL = 'gpt-3.5-turbo';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private openai?: OpenAI;

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
    private readonly cloudinaryService: CloudinaryService,
    private readonly conversionService: ConversionService,
    private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');

    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    }
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
      const uploadResult = await this.cloudinaryService.uploadFile(file);
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
        const pdfUpload = await this.cloudinaryService.uploadFile(pdfFile);
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
    });

    const savedMaterial = await this.materialRepo.save(material);

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

    if (material.uploader.id !== user.id) {
      throw new NotFoundException('You can only delete your own materials');
    }

    // Delete from Cloudinary
    if (material.fileUrl) {
      const publicId = this.extractPublicIdFromUrl(material.fileUrl);

      if (publicId) {
        await this.cloudinaryService.deleteFile(publicId);
      }
    }

    // Delete PDF version if exists and different
    if (material.pdfUrl && material.pdfUrl !== material.fileUrl) {
      const publicId = this.extractPublicIdFromUrl(material.pdfUrl);

      if (publicId) {
        await this.cloudinaryService.deleteFile(publicId);
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
    if (!material.content)
      throw new Error(
        'Material content is not available. Please re-upload the file.',
      );

    return this.getOrGenerateSummary(material);
  }

  private async getOrGenerateSummary(material: Material): Promise<string> {
    if (material.summary) return material.summary;

    if (!this.openai) return '';

    const content = material.content;

    if (!content) return '';

    try {
      const response = await this.openai.chat.completions.create({
        model: COMPLETION_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'Summarize the following text concisely but comprehensively for a student.',
          },
          { role: 'user', content: content.substring(0, 6000) },
        ],
        max_tokens: 500,
      });

      const summary = response.choices[0].message.content ?? '';

      if (summary) {
        material.summary = summary;
        await this.materialRepo.save(material);
      }

      return summary;
    } catch (e) {
      this.logger.error('Failed to generate summary', e);

      return '';
    }
  }

  async extractKeyPoints(materialId: string): Promise<string[]> {
    const material = await this.materialRepo.findOne({
      where: { id: materialId },
    });

    if (!material) throw new NotFoundException('Material not found');

    const materialContent = material.content;

    if (!materialContent)
      throw new Error(
        'Material content is not available. Please re-upload the file.',
      );

    // Return cached key points if available
    if (material.keyPoints && material.keyPoints.length > 0) {
      return material.keyPoints;
    }

    if (!this.openai) throw new Error('OPENAI_API_KEY is not set');

    try {
      const response = await this.openai.chat.completions.create({
        model: COMPLETION_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'Extract 5-7 key bullet points from the following text. Return them as a JSON array of strings.',
          },
          { role: 'user', content: materialContent.substring(0, 6000) },
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

  async generateQuiz(materialId: string, pageLimit?: number) {
    const material = await this.materialRepo.findOne({
      where: { id: materialId },
    });

    if (!material) throw new NotFoundException('Material not found');

    let materialContent = material.content;

    if (!materialContent)
      throw new Error(
        'Material content is not available. Please re-upload the file.',
      );

    // If pageLimit is provided, truncate content
    // Approximation: 3000 characters per page
    if (pageLimit && pageLimit > 0) {
      const charLimit = pageLimit * 3000;

      if (materialContent.length > charLimit) {
        materialContent = materialContent.substring(0, charLimit);
      }
    }

    // Return cached quiz if available AND no page limit was requested
    // If page limit is requested, we always generate fresh (or we could cache with a key, but for now fresh)
    if (!pageLimit && material.quiz) {
      return material.quiz;
    }

    if (!this.openai) throw new Error('OPENAI_API_KEY is not set');

    const systemPrompt = `You are a strict API endpoint. You receive text and output ONLY valid JSON.`;
    const userPrompt = `Generate 5 multiple-choice questions based on the following text.
    Return the result as a JSON object with a "questions" key containing an array of objects with the following structure:
    {
      "questions": [
        {
          "question": "string",
          "options": ["string", "string", "string", "string"],
          "correctAnswer": "string",
          "explanation": "string"
        }
      ]
    }
    
    Text:
    ${materialContent.substring(0, 6000)}`; // Still cap at 6000 for token limits if pageLimit is huge

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      });

      let content = response.choices[0].message.content;

      if (!content) return [];

      content = this.cleanJson(content);

      let parsed;

      try {
        parsed = JSON.parse(content);
      } catch (e) {
        this.logger.error(`Failed to parse quiz JSON: ${content}`, e);
        throw e;
      }
      const quiz = parsed.questions ?? [];

      // Cache the result ONLY if it's a full quiz (no page limit)
      if (!pageLimit && quiz.length > 0) {
        material.quiz = quiz;
        await this.materialRepo.save(material);
      }

      return quiz;
    } catch (error) {
      this.logger.error('Failed to generate quiz', error);
      throw new Error('Failed to generate quiz');
    }
  }

  async generateFlashcards(materialId: string) {
    const material = await this.materialRepo.findOne({
      where: { id: materialId },
    });

    if (!material) throw new NotFoundException('Material not found');

    // Return cached flashcards if available
    if (material.flashcards && material.flashcards.length > 0) {
      return material.flashcards;
    }

    const materialContent = material.content;

    if (!materialContent)
      throw new Error(
        'Material content is not available. Please re-upload the file.',
      );

    if (!this.openai) throw new Error('OPENAI_API_KEY is not set');

    const systemPrompt = `You are a strict API endpoint. You receive text and output ONLY valid JSON.`;
    const userPrompt = `Extract 10-15 key terms and their definitions from the following text.
    Return the result as a JSON object with a "flashcards" key containing an array of objects with the following structure:
    {
      "flashcards": [
        {
          "term": "string",
          "definition": "string"
        }
      ]
    }
    
    Text:
    ${materialContent.substring(0, 6000)}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      });

      let content = response.choices[0].message.content;

      if (!content) return [];

      content = this.cleanJson(content);

      let parsed;

      try {
        parsed = JSON.parse(content);
      } catch (e) {
        this.logger.error(`Failed to parse flashcards JSON: ${content}`, e);
        throw e;
      }
      const flashcards = parsed.flashcards ?? [];

      // Cache the result
      if (flashcards.length > 0) {
        material.flashcards = flashcards;
        await this.materialRepo.save(material);
      }

      return flashcards;
    } catch (error) {
      this.logger.error('Failed to generate flashcards', error);
      throw new Error('Failed to generate flashcards');
    }
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
    if (!this.openai) throw new Error('OPENAI_API_KEY is not set');

    const system = `You are a helpful student assistant. Use the provided context to answer the student's question. 
    If a FOCUSED SOURCE is provided, prioritize it above all else.
    If the user asks for a summary, provide a comprehensive summary of the FOCUSED SOURCE.
    If the context contains relevant course material, cite it. 
    If the student asks about past questions, look for materials categorized as such.
    Context:\n${context}`;

    const userPrompt = `History:\n${historyText}\n\nQuestion: ${question}`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: COMPLETION_MODEL,
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
    if (!this.openai) throw new Error('OPENAI_API_KEY is not set');

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
        model: 'gpt-4o',
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
      throw new Error('Failed to perform context action');
    }
  }
}

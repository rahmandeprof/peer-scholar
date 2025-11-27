import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Conversation } from './entities/conversation.entity';
import { Material, MaterialCategory } from './entities/material.entity';
import { Message, MessageRole } from './entities/message.entity';
import { User } from '@/app/users/entities/user.entity';

import { UsersService } from '@/app/users/users.service';

import axios from 'axios';
import { Brackets, Repository } from 'typeorm';

const COMPLETION_MODEL = 'gpt-3.5-turbo';

import { CloudinaryService } from '@/app/common/services/cloudinary.service';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectRepository(Material)
    private readonly materialRepo: Repository<Material>,
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    private readonly usersService: UsersService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  // Extract text from file (pdf, docx, txt)
  async extractTextFromFile(file: Express.Multer.File): Promise<string> {
    // ... existing implementation ...
    const mime = file.mimetype || '';

    if (mime.includes('pdf') || file.originalname.endsWith('.pdf')) {
      try {
        type PdfModuleType =
          | { default?: (input: Buffer) => Promise<{ text: string }> }
          | ((input: Buffer) => Promise<{ text: string }>);
        const pdfModule = (await import(
          'pdf-parse'
        )) as unknown as PdfModuleType;
        const pdfParse = (
          typeof pdfModule === 'function' ? pdfModule : pdfModule.default
        ) as (input: Buffer) => Promise<{ text: string }>;
        const data = await pdfParse(file.buffer);

        return data.text;
      } catch {
        throw new Error(
          'pdf-parse is required to extract PDF text. Install pdf-parse.',
        );
      }
    }

    if (
      mime.includes('officedocument') ||
      mime.includes('msword') ||
      file.originalname.endsWith('.docx')
    ) {
      try {
        const mammoth = await import('mammoth');
        const res = await mammoth.extractRawText({ buffer: file.buffer });

        return res.value || '';
      } catch {
        throw new Error(
          'mammoth is required to extract DOCX text. Install mammoth.',
        );
      }
    }

    // fallback: assume UTF-8 text
    return file.buffer.toString('utf8');
  }

  async saveMaterial(
    user: User,
    file: Express.Multer.File,
    metadata: {
      title: string;
      category: MaterialCategory;
      department?: string;
      yearLevel?: number;
      isPublic?: string;
    },
  ) {
    const text = await this.extractTextFromFile(file);

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

    const material = this.materialRepo.create({
      ...metadata,
      isPublic: metadata.isPublic === 'true',
      content: text,
      url,
      type: file.mimetype,
      uploadedBy: user,
    });

    return this.materialRepo.save(material);
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

  async sendMessage(
    user: User,
    conversationId: string | null,
    content: string,
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

  private async generateResponse(
    user: User,
    question: string,
    conversationId: string,
  ) {
    // 1. Retrieve context from materials
    // Simple keyword search for now. In production, use vector search.
    const keywords = question.split(' ').filter((w) => w.length > 3);

    // Build a query to find relevant materials based on user's dept/year OR user's private files
    const queryBuilder = this.materialRepo
      .createQueryBuilder('material')
      .leftJoin('material.uploadedBy', 'uploader')
      .where(
        '(material.isPublic = :isPublic AND material.department = :dept AND material.yearLevel = :year) OR (uploader.id = :userId)',
        {
          isPublic: true,
          dept: user.department,
          year: user.yearOfStudy,
          userId: user.id,
        },
      );

    // Add keyword matching (very basic)
    if (keywords.length > 0) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where(
            keywords
              .map((_, i) => `material.content ILIKE :keyword${String(i)}`)
              .join(' OR '),
            keywords.reduce(
              (acc, k, i) => ({ ...acc, [`keyword${String(i)}`]: `%${k}%` }),
              {},
            ),
          );
        }),
      );
    }

    const materials = await queryBuilder.take(3).getMany();

    const context = materials
      .map((m) => `SOURCE: ${m.title}\n${m.content.substring(0, 500)}...`)
      .join('\n\n');

    // 2. Retrieve recent chat history
    const history = await this.messageRepo.find({
      where: { conversationId },
      order: { createdAt: 'DESC' },
      take: 5,
    });
    const historyText = history
      .reverse()
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n');

    // 3. Call OpenAI
    const key = process.env.OPENAI_API_KEY;

    if (!key) throw new Error('OPENAI_API_KEY is not set');

    const system = `You are a helpful student assistant. Use the provided context to answer the student's question. 
    If the context contains relevant course material, cite it. 
    If the student asks about past questions, look for materials categorized as such.
    Context:\n${context}`;

    const userPrompt = `History:\n${historyText}\n\nQuestion: ${question}`;

    try {
      const completion = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: COMPLETION_MODEL,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 512,
        },
        { headers: { Authorization: `Bearer ${key}` } },
      );

      const answer = completion.data.choices?.[0]?.message?.content ?? '';

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
      .leftJoin('material.uploadedBy', 'uploader')
      .where(
        '(material.isPublic = :isPublic AND material.department = :dept AND material.yearLevel = :year) OR (uploader.id = :userId)',
        {
          isPublic: true,
          dept: user.department,
          year: user.yearOfStudy,
          userId: user.id,
        },
      )
      .orderBy('material.createdAt', 'DESC');

    return queryBuilder.getMany();
  }
}

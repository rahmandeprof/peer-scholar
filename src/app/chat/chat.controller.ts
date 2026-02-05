import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';

import { RateLimitGuard } from '@/app/auth/guards/rate-limit.guard';

import { User } from '@/app/users/entities/user.entity';

import { ContextActionDto } from './dto/context-action.dto';
import { SaveQuizResultDto } from './dto/save-quiz-result.dto';

import { ChatService } from './chat.service';

import { QuizDifficulty } from '@/app/quiz-engine';

import { Request } from 'express';

interface RequestWithUser extends Request {
  user: User;
}

@Controller('chat')
@UseGuards(AuthGuard('jwt'))
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('message')
  @UseGuards(RateLimitGuard)
  @Throttle({ chat: { limit: 100, ttl: 86400000 } }) // 100 messages per day
  sendMessage(
    @Body()
    body: { conversationId?: string; content: string; materialId?: string },
    @Req() req: RequestWithUser,
  ) {
    return this.chatService.sendMessage(
      req.user,
      body.conversationId ?? null,
      body.content,
      body.materialId,
    );
  }

  @Delete('history/:id')
  deleteConversation(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: RequestWithUser,
  ) {
    return this.chatService.deleteConversation(id, req.user);
  }

  @Patch('history/:id')
  renameConversation(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body('title') title: string,
    @Req() req: RequestWithUser,
  ) {
    return this.chatService.renameConversation(id, title, req.user);
  }

  @Get('history')
  getHistory(@Req() req: RequestWithUser) {
    return this.chatService.getConversations(req.user);
  }

  @Get('history/:id')
  async getConversation(@Param('id') id: string, @Req() req: RequestWithUser) {
    const conversation = await this.chatService.getConversation(id, req.user);
    const messages = await this.chatService.getMessages(id);

    return {
      id: conversation.id,
      title: conversation.title,
      userId: conversation.userId,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      messages,
    };
  }

  @Get('materials')
  getMaterials(@Req() req: RequestWithUser) {
    return this.chatService.getMaterials(req.user);
  }

  /**
   * Lightweight endpoint to check if a material exists
   * Used for validating viewing history entries
   */
  @Get('materials/:id/exists')
  async checkMaterialExists(@Param('id', new ParseUUIDPipe()) id: string) {
    const exists = await this.chatService.materialExists(id);

    if (!exists) {
      return { exists: false };
    }

    return { exists: true };
  }

  @Delete('materials/:id')
  deleteMaterial(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: RequestWithUser,
  ) {
    return this.chatService.deleteMaterial(id, req.user);
  }

  @Post('quiz/:id')
  @UseGuards(RateLimitGuard)
  @Throttle({ quiz: { limit: 10, ttl: 86400000 } })
  generateQuiz(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body('pageStart') pageStart?: number,
    @Body('pageEnd') pageEnd?: number,
    @Body('regenerate') regenerate?: boolean,
    @Body('difficulty') difficulty?: 'beginner' | 'intermediate' | 'advanced',
    @Body('questionCount') questionCount?: number,
  ) {
    return this.chatService.generateQuiz(
      id,
      pageStart,
      pageEnd,
      regenerate,
      difficulty as QuizDifficulty,
      questionCount,
    );
  }

  @Post('flashcards/:id')
  @UseGuards(RateLimitGuard)
  @Throttle({ flashcards: { limit: 10, ttl: 86400000 } }) // 10 per day
  generateFlashcards(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body('cardCount') cardCount?: number,
    @Body('pageStart') pageStart?: number,
    @Body('pageEnd') pageEnd?: number,
  ) {
    return this.chatService.generateFlashcards(
      id,
      cardCount,
      pageStart,
      pageEnd,
    );
  }

  @Get('summary/:id')
  @UseGuards(RateLimitGuard)
  @Throttle({ summary: { limit: 20, ttl: 86400000 } }) // 20 per day
  getSummary(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.chatService.getSummary(id);
  }

  @Get('key-points/:id')
  @UseGuards(RateLimitGuard)
  @Throttle({ keypoints: { limit: 20, ttl: 86400000 } }) // 20 per day
  getKeyPoints(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.chatService.extractKeyPoints(id);
  }

  @Post('quiz/result')
  saveQuizResult(@Body() dto: SaveQuizResultDto, @Req() req: RequestWithUser) {
    return this.chatService.saveQuizResult(
      req.user,
      dto.materialId,
      dto.score,
      dto.totalQuestions,
    );
  }

  @Get('quiz/history')
  getQuizHistory(@Req() req: RequestWithUser) {
    return this.chatService.getQuizHistory(req.user);
  }

  @Post('material/:id/comment')
  addComment(
    @Param('id') id: string,
    @Body('content') content: string,
    @Req() req: RequestWithUser,
  ) {
    if (!req.user.isVerified) {
      throw new ForbiddenException(
        'You must verify your email to post comments.',
      );
    }

    return this.chatService.addComment(req.user, id, content);
  }

  @Get('material/:id/comments')
  getComments(@Param('id') id: string) {
    return this.chatService.getComments(id);
  }

  @Post('context-action')
  performContextAction(@Body() body: ContextActionDto) {
    return this.chatService.performContextAction(body);
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';

import { MaterialType } from '../academic/entities/material.entity';
import { User } from '@/app/users/entities/user.entity';

import { ContextActionDto } from './dto/context-action.dto';

import { ChatService } from './chat.service';

import { Request } from 'express';

interface RequestWithUser extends Request {
  user: User;
}

@Controller('chat')
@UseGuards(AuthGuard('jwt'))
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body()
    body: {
      title: string;
      category: MaterialType;
      department?: string;
      yearLevel?: number;
      isPublic?: string;
      courseCode?: string;
      topic?: string;
    },
    @Req() req: RequestWithUser,
  ) {
    return this.chatService.saveMaterial(req.user, file, body);
  }

  @Post('message')
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

  @Delete('materials/:id')
  deleteMaterial(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: RequestWithUser,
  ) {
    return this.chatService.deleteMaterial(id, req.user);
  }

  @Post('quiz/:id')
  generateQuiz(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.chatService.generateQuiz(id);
  }

  @Get('summary/:id')
  getSummary(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.chatService.getSummary(id);
  }

  @Get('key-points/:id')
  getKeyPoints(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.chatService.extractKeyPoints(id);
  }

  @Post('quiz/result')
  saveQuizResult(
    @Body()
    body: {
      materialId: string;
      score: number;
      totalQuestions: number;
    },
    @Req() req: RequestWithUser,
  ) {
    return this.chatService.saveQuizResult(
      req.user,
      body.materialId,
      body.score,
      body.totalQuestions,
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

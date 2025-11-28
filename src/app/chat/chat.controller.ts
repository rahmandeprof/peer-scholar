import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Delete,
  ParseUUIDPipe,
  Patch,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';

import { MaterialCategory } from './entities/material.entity';
import { User } from '@/app/users/entities/user.entity';

import { ChatService } from './chat.service';

import { Request } from 'express';

interface RequestWithUser extends Request {
  user: User;
}

@Controller('chat')
@UseGuards(AuthGuard('jwt'))
export class ChatController {
  constructor(private readonly chatService: ChatService) { }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body()
    body: {
      title: string;
      category: MaterialCategory;
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
    @Body() body: { conversationId?: string; content: string; materialId?: string },
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
  deleteConversation(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: RequestWithUser) {
    console.log('DELETE request received for id:', id);
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
  generateQuiz(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: RequestWithUser,
  ) {
    return this.chatService.generateQuiz(id, req.user);
  }
}

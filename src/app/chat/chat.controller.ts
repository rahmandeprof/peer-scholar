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

  @Get('history')
  getHistory(@Req() req: RequestWithUser) {
    return this.chatService.getConversations(req.user);
  }

  @Delete('history/:id')
  deleteConversation(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.chatService.deleteConversation(id, req.user);
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
}

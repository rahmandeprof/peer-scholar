import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CommonModule } from '@/app/common/common.module';
import { QuizEngineModule } from '@/app/quiz-engine/quiz-engine.module';
import { UsersModule } from '@/app/users/users.module';

import { Material } from '../academic/entities/material.entity';
import { MaterialChunk } from '../academic/entities/material-chunk.entity';
import { Comment } from './entities/comment.entity';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { QuizResult } from './entities/quiz-result.entity';

import { ChatController } from './chat.controller';

import { ChatService } from './chat.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Conversation,
      Message,
      Material,
      MaterialChunk,
      QuizResult,
      Comment,
    ]),
    UsersModule,
    CommonModule,
    QuizEngineModule,
  ],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule { }

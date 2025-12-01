import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UsersModule } from '@/app/users/users.module';

import { Material } from '../academic/entities/material.entity';
import { MaterialChunk } from '../academic/entities/material-chunk.entity';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';

import { ChatController } from './chat.controller';

import { ChatService } from './chat.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Material, MaterialChunk, Conversation, Message]),
    UsersModule,
  ],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}

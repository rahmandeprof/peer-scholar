import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UsersModule } from '@/app/users/users.module';

import { Conversation } from './entities/conversation.entity';
import { Material } from './entities/material.entity';
import { Message } from './entities/message.entity';

import { ChatController } from './chat.controller';

import { ChatService } from './chat.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Material, Conversation, Message]),
    UsersModule,
  ],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}

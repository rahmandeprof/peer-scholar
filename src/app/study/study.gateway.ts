import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';

import { User } from '@/app/users/entities/user.entity';

import { ChatService } from '@/app/chat/chat.service';

import { Server, Socket } from 'socket.io';
import { Repository } from 'typeorm';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class StudyGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(StudyGateway.name);

  private challengeScores = new Map<
    string,
    Record<string, { score: number; timeTaken: number }>
  >();

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly chatService: ChatService, // Inject ChatService
  ) {}

  async handleConnection(client: Socket) {
    // We expect the client to send userId in query or auth header
    // For simplicity, let's assume they join a room with their userId immediately upon connection
    // or we handle it in a separate event.
    // Ideally, we validate the token here.
  }

  handleDisconnect(client: Socket) {
    // Handle cleanup
  }

  @SubscribeMessage('join_user_room')
  handleJoinUserRoom(
    @MessageBody() userId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`user_${userId}`);
    this.updateLastSeen(userId);
  }

  @SubscribeMessage('invite_user')
  handleInviteUser(
    @MessageBody() data: { senderId: string; receiverId: string },
  ) {
    this.server.to(`user_${data.receiverId}`).emit('receive_invite', {
      senderId: data.senderId,
    });
  }

  @SubscribeMessage('challenge_request')
  handleChallengeRequest(
    @MessageBody()
    data: {
      senderId: string;
      receiverId: string;
      materialId: string;
    },
  ) {
    this.server.to(`user_${data.receiverId}`).emit('receive_challenge', data);
  }

  @SubscribeMessage('challenge_response')
  async handleChallengeResponse(
    @MessageBody()
    data: {
      senderId: string;
      receiverId: string;
      materialId: string;
      accept: boolean;
    },
  ) {
    if (data.accept) {
      const challengeId = `challenge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Generate quiz questions once for the challenge
      // We'll emit them with the start event so both get the same questions
      try {
        const questions = await this.chatService.generateQuiz(data.materialId);

        const startPayload = {
          challengeId,
          materialId: data.materialId,
          questions,
        };

        this.server
          .to(`user_${data.senderId}`)
          .emit('start_challenge', startPayload);
        this.server
          .to(`user_${data.receiverId}`)
          .emit('start_challenge', startPayload);
      } catch (e) {
        this.logger.error('Failed to generate challenge quiz', e);
        // Fallback or error handling
      }
    }
  }

  @SubscribeMessage('submit_score')
  handleSubmitScore(
    @MessageBody()
    data: {
      challengeId: string;
      userId: string;
      score: number;
      timeTaken: number;
    },
  ) {
    const { challengeId, userId, score, timeTaken } = data;

    if (!this.challengeScores.has(challengeId)) {
      this.challengeScores.set(challengeId, {});
    }

    const scores = this.challengeScores.get(challengeId);

    if (scores) {
      scores[userId] = { score, timeTaken };

      // Check if we have 2 scores (assuming 2 player challenge)
      if (Object.keys(scores).length >= 2) {
        // Determine winner
        const userIds = Object.keys(scores);
        const p1 = userIds[0];
        const p2 = userIds[1];
        const s1 = scores[p1];
        const s2 = scores[p2];

        let winnerId: string | null = null;

        if (s1.score > s2.score) winnerId = p1;
        else if (s2.score > s1.score) winnerId = p2;
        else {
          // Tie breaker: time
          if (s1.timeTaken < s2.timeTaken) winnerId = p1;
          else if (s2.timeTaken < s1.timeTaken) winnerId = p2;
          else winnerId = 'tie';
        }

        this.server.to(`challenge_${challengeId}`).emit('challenge_result', {
          winnerId,
          scores,
        });

        // Cleanup
        this.challengeScores.delete(challengeId);
      }
    }
  }

  @SubscribeMessage('join_challenge_room')
  handleJoinChallengeRoom(
    @MessageBody() challengeId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`challenge_${challengeId}`);
  }

  @SubscribeMessage('join_study_room')
  handleJoinStudyRoom(
    @MessageBody() roomId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(roomId);
  }

  @SubscribeMessage('sync_timer')
  handleSyncTimer(
    @MessageBody() data: { roomId: string; action: string; time?: number },
    @ConnectedSocket() client: Socket,
  ) {
    // Broadcast to everyone in the room EXCEPT the sender
    client.to(data.roomId).emit('timer_update', data);
  }

  @SubscribeMessage('trigger_quiz')
  handleTriggerQuiz(
    @MessageBody() data: { roomId: string; seed: number; materialId: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.server.to(data.roomId).emit('start_quiz', data);
  }

  @SubscribeMessage('update_status')
  async handleUpdateStatus(@MessageBody() userId: string) {
    await this.updateLastSeen(userId);
  }

  private async updateLastSeen(userId: string) {
    try {
      await this.userRepo.update(userId, { lastSeen: new Date() });
    } catch (e) {
      this.logger.error(`Failed to update lastSeen for ${userId}`, e);
    }
  }
}

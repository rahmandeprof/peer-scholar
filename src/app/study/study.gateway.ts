import { Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
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

import { ChallengeCacheService } from './challenge-cache.service';
import { ChatService } from '@/app/chat/chat.service';
import { PushService } from '@/app/notifications/push.service';

import { Server, Socket } from 'socket.io';
import { Repository } from 'typeorm';

@WebSocketGateway({
  cors: {
    origin: (origin, callback) => {
      // Allow connections from trusted origins or same-origin (no origin header)
      const trustedOrigins = process.env.TRUSTED_ORIGINS?.split(',') ?? [];

      if (
        !origin ||
        trustedOrigins.includes(origin) ||
        origin.includes('localhost')
      ) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  },
})
export class StudyGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(StudyGateway.name);
  private lastSeenCache = new Map<string, number>();
  private readonly THROTTLE_MS = 60_000; // 1 minute

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly challengeCache: ChallengeCacheService,
    private readonly pushService: PushService,
  ) { }

  onModuleInit() {
    // Clean up stale entries every 10 minutes
    setInterval(() => {
      const cutoff = Date.now() - this.THROTTLE_MS;
      for (const [key, time] of this.lastSeenCache) {
        if (time < cutoff) this.lastSeenCache.delete(key);
      }
    }, 10 * 60_000);
  }

  async handleConnection(client: Socket) {
    try {
      // Extract token from auth object or authorization header
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Connection rejected: No token provided`);
        client.disconnect();

        return;
      }

      // Verify the JWT token
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      // Store user ID on socket for later use
      client.data.userId = payload.sub;
      this.logger.log(`Client connected: ${payload.sub}`);

      // Update lastSeen on connection
      this.throttledUpdateLastSeen(payload.sub);
    } catch (error) {
      this.logger.warn(`Connection rejected: Invalid token`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    if (client.data.userId) {
      this.logger.log(`Client disconnected: ${client.data.userId}`);
      // Update lastSeen on disconnect for accurate "last active" time
      this.throttledUpdateLastSeen(client.data.userId);
    }
  }

  @SubscribeMessage('join_user_room')
  handleJoinUserRoom(
    @MessageBody() userId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`user_${userId}`);
    this.throttledUpdateLastSeen(userId);
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
  async handleChallengeRequest(
    @MessageBody()
    data: {
      senderId: string;
      receiverId: string;
      materialId: string;
    },
  ) {
    // Emit socket event for real-time in-app notification
    this.server.to(`user_${data.receiverId}`).emit('receive_challenge', data);

    // Send push notification if receiver is offline or has app in background
    try {
      const receiver = await this.userRepo.findOne({
        where: { id: data.receiverId },
      });
      const sender = await this.userRepo.findOne({
        where: { id: data.senderId },
      });

      if (receiver?.pushSubscription && sender) {
        await this.pushService.sendChallengeNotification(
          receiver.pushSubscription,
          sender.firstName,
          data.materialId,
        );
      }
    } catch (e) {
      this.logger.error('Failed to send challenge push notification', e);
    }
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
  async handleSubmitScore(
    @MessageBody()
    data: {
      challengeId: string;
      userId: string;
      score: number;
      timeTaken: number;
    },
  ) {
    const { challengeId, userId, score, timeTaken } = data;

    // Store score in Redis/cache
    await this.challengeCache.setScore(challengeId, userId, {
      score,
      timeTaken,
    });

    // Check if we have 2 scores (assuming 2 player challenge)
    const scoreCount = await this.challengeCache.getScoreCount(challengeId);

    if (scoreCount >= 2) {
      const scores = await this.challengeCache.getScores(challengeId);

      if (scores) {
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
        await this.challengeCache.deleteChallenge(challengeId);
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
    this.throttledUpdateLastSeen(userId);
  }

  private throttledUpdateLastSeen(userId: string) {
    const now = Date.now();
    const lastUpdate = this.lastSeenCache.get(userId) ?? 0;

    if (now - lastUpdate > this.THROTTLE_MS) {
      this.lastSeenCache.set(userId, now);
      this.userRepo.update(userId, { lastSeen: new Date() }).catch((e) => {
        this.logger.error(`Failed to update lastSeen for ${userId}`, e);
      });
    }
  }
}

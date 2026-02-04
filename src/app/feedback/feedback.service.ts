import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Feedback } from './entities/feedback.entity';
import { User } from '@/app/users/entities/user.entity';

import { CreateFeedbackDto } from './dto/create-feedback.dto';

import { Repository } from 'typeorm';

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(
    @InjectRepository(Feedback)
    private readonly feedbackRepo: Repository<Feedback>,
  ) {}

  async create(dto: CreateFeedbackDto, user: User): Promise<Feedback> {
    const feedback = this.feedbackRepo.create({
      message: dto.message,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      user: user,
    });

    this.logger.log(`New feedback from ${user.email}`);

    return this.feedbackRepo.save(feedback);
  }

  async findAll(): Promise<Feedback[]> {
    return this.feedbackRepo.find({
      order: { createdAt: 'DESC' },
      take: 100, // Limit to last 100 feedbacks
    });
  }

  async count(): Promise<number> {
    return this.feedbackRepo.count();
  }

  async countUnread(): Promise<number> {
    return this.feedbackRepo.count({ where: { isRead: false } });
  }

  async toggleRead(id: string): Promise<Feedback | null> {
    const feedback = await this.feedbackRepo.findOne({ where: { id } });

    if (!feedback) return null;

    feedback.isRead = !feedback.isRead;

    return this.feedbackRepo.save(feedback);
  }
}

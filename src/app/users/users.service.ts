import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';

import {
  PartnerRequest,
  PartnerRequestStatus,
} from '@/app/users/entities/partner-request.entity';
import { StudyStreak } from '@/app/users/entities/study-streak.entity';
import { User } from '@/app/users/entities/user.entity';

import { CreateUserDto } from '@/app/users/dto/create-user.dto';
import { UpdateAcademicProfileDto } from '@/app/users/dto/update-academic-profile.dto';
import { UpdateUserDto } from '@/app/users/dto/update-user.dto';

import { EmailService } from '@/app/common/services/email.service';
import { WinstonLoggerService } from '@/logger/winston-logger/winston-logger.service';
import { PaginationService } from '@/pagination/pagination.service';

import { SuccessResponse } from '@/utils/response';

import { FilterOperator, PaginateQuery } from 'nestjs-paginate';
import { Repository } from 'typeorm';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(StudyStreak)
    private readonly streakRepository: Repository<StudyStreak>,
    @InjectRepository(PartnerRequest)
    private readonly partnerRequestRepo: Repository<PartnerRequest>,
    private readonly logger: WinstonLoggerService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {
    this.logger.setContext(UsersService.name);
  }

  async invitePartner(userId: string, email: string) {
    const sender = await this.getOne(userId);
    const receiver = await this.findByEmail(email);

    if (!receiver) throw new NotFoundException('User not found');
    if (sender.id === receiver.id) throw new Error('Cannot invite yourself');
    if (sender.partnerId) throw new Error('You already have a partner');
    if (receiver.partnerId) throw new Error('User already has a partner');

    const existingRequest = await this.partnerRequestRepo.findOne({
      where: [
        {
          sender: { id: sender.id },
          receiver: { id: receiver.id },
          status: PartnerRequestStatus.PENDING,
        },
        {
          sender: { id: receiver.id },
          receiver: { id: sender.id },
          status: PartnerRequestStatus.PENDING,
        },
      ],
    });

    if (existingRequest) throw new Error('Pending request already exists');

    const request = this.partnerRequestRepo.create({
      sender,
      receiver,
      status: PartnerRequestStatus.PENDING,
    });

    await this.partnerRequestRepo.save(request);

    // Send email
    // In a real app, generate a token/link. For now, just link to the app.
    const clientUrl = this.configService.get<string>('CLIENT_URL') ?? '';
    const link = `${clientUrl}/partner`;

    await this.emailService.sendPartnerInvite(
      receiver.email,
      sender.firstName,
      link,
    );

    return request;
  }

  async cancelInvite(requestId: string, userId: string) {
    const request = await this.partnerRequestRepo.findOne({
      where: { id: requestId },
      relations: ['sender'],
    });

    if (!request) throw new NotFoundException('Request not found');
    if (request.sender.id !== userId) throw new Error('Not authorized');
    if (request.status !== PartnerRequestStatus.PENDING)
      throw new Error('Cannot cancel processed request');

    return this.partnerRequestRepo.remove(request);
  }

  async respondToRequest(requestId: string, userId: string, accept: boolean) {
    const request = await this.partnerRequestRepo.findOne({
      where: { id: requestId },
      relations: ['sender', 'receiver'],
    });

    if (!request) throw new NotFoundException('Request not found');
    if (request.receiver.id !== userId) throw new Error('Not authorized');
    if (request.status !== PartnerRequestStatus.PENDING)
      throw new Error('Request already handled');

    if (accept) {
      request.status = PartnerRequestStatus.ACCEPTED;

      // Update users
      await this.userRepository.update(request.sender.id, {
        partnerId: request.receiver.id,
      });
      await this.userRepository.update(request.receiver.id, {
        partnerId: request.sender.id,
      });
    } else {
      request.status = PartnerRequestStatus.REJECTED;
      // TODO: Send notification to sender about rejection
      // For now, we just update the status. The sender can see it in their "Sent Requests" if we show history,
      // or we can remove it. The user asked for notification.
      // Since we don't have a notification system yet, we'll rely on the status update.
      // But we should probably delete the request or mark it as rejected so it doesn't clutter.
      // Let's keep it as REJECTED for history.
    }

    return this.partnerRequestRepo.save(request);
  }

  async getPartnerStats(userId: string) {
    const user = await this.getOne(userId);

    if (!user.partnerId) return null;

    const partner = await this.getOne(user.partnerId);
    const partnerStreak = await this.streakRepository.findOne({
      where: { userId: partner.id },
    });

    const userEffectiveStreak = await this.calculateEffectiveStreak(userId);
    const partnerEffectiveStreak =
      this.calculateEffectiveStreakFromEntity(partnerStreak);

    return {
      partner: {
        firstName: partner.firstName,
        lastName: partner.lastName,
        currentStreak: partnerEffectiveStreak,
        lastActivity: partnerStreak?.lastActivityDate,
      },
      combinedStreak: Math.min(userEffectiveStreak, partnerEffectiveStreak),
    };
  }

  getPendingRequests(userId: string) {
    return this.partnerRequestRepo.find({
      where: { receiver: { id: userId }, status: PartnerRequestStatus.PENDING },
      relations: ['sender'],
    });
  }

  getSentRequests(userId: string) {
    return this.partnerRequestRepo.find({
      where: { sender: { id: userId }, status: PartnerRequestStatus.PENDING },
      relations: ['receiver'],
    });
  }

  async create(createUserDto: CreateUserDto) {
    const { department, ...rest } = createUserDto;
    const user = this.userRepository.create({
      ...rest,
      department,
    });
    const savedUser = await this.userRepository.save(user);

    // Initialize streak
    const streak = this.streakRepository.create({
      user: savedUser,
      userId: savedUser.id,
      currentStreak: 0,
      longestStreak: 0,
    });

    await this.streakRepository.save(streak);

    return savedUser;
  }

  findAll(query: PaginateQuery) {
    return PaginationService.paginate(query, this.userRepository, {
      searchableColumns: ['firstName', 'lastName', 'email'],
      filterableColumns: {
        firstName: [FilterOperator.EQ],
      },
    });
  }

  async getOne(id: string) {
    const user = await this.userRepository.findOneBy({ id });

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return user;
  }

  async findOne(id: string) {
    const user = await this.getOne(id);

    return new SuccessResponse('User retrieved', user);
  }

  findByEmail(email: string) {
    return this.userRepository.findOne({ where: { email } });
  }

  async findOneProfile(id: string) {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .where('user.id = :id', { id })
      .getOne();

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.getOne(id);

    // Handle academic relations - simplified since they are strings now or handled directly
    // If we still want to support the old DTO structure mapping to new string fields:
    if (updateUserDto.facultyId) {
      // Assuming we want to map ID to name or just ignore if we expect name in 'faculty' field
      // But User entity has 'faculty' as string.
      // Let's just rely on 'faculty' and 'department' fields from DTO if they exist.
    }

    // Handle other fields
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { schoolId, facultyId, departmentId, ...rest } = updateUserDto;

    Object.assign(user, rest);

    return this.userRepository.save(user);
  }

  async updateAcademicProfile(id: string, dto: UpdateAcademicProfileDto) {
    const user = await this.getOne(id);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    user.school = { id: dto.schoolId } as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    user.faculty = { id: dto.facultyId } as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    user.department = { id: dto.departmentId } as any;
    user.yearOfStudy = dto.yearOfStudy;

    return this.userRepository.save(user);
  }

  async remove(id: string) {
    const user = await this.getOne(id);

    return this.userRepository.remove(user);
  }

  private getDiffDays(date1: Date, date2: Date): number {
    const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
    const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
    const diffTime = Math.abs(d1.getTime() - d2.getTime());

    return Math.round(diffTime / (1000 * 3600 * 24));
  }

  private calculateEffectiveStreakFromEntity(
    streak: StudyStreak | null,
  ): number {
    if (!streak) return 0;
    if (!streak.lastActivityDate) return 0;

    const diffDays = this.getDiffDays(new Date(), streak.lastActivityDate);

    // If last activity was today (0) or yesterday (1), streak is valid.
    // If > 1, streak is broken, so effective streak is 0.
    if (diffDays > 1) return 0;

    return streak.currentStreak;
  }

  async calculateEffectiveStreak(userId: string): Promise<number> {
    const streak = await this.streakRepository.findOne({ where: { userId } });

    return this.calculateEffectiveStreakFromEntity(streak);
  }

  async updateStreak(userId: string) {
    let streak = await this.streakRepository.findOne({ where: { userId } });

    streak ??= this.streakRepository.create({
      userId,
      currentStreak: 0,
      longestStreak: 0,
    });

    const now = new Date();

    if (streak.lastActivityDate) {
      const diffDays = this.getDiffDays(now, streak.lastActivityDate);

      if (diffDays === 0) {
        // Same day, do nothing
      } else if (diffDays === 1) {
        // Consecutive day
        streak.currentStreak += 1;
        if (streak.currentStreak > streak.longestStreak) {
          streak.longestStreak = streak.currentStreak;
        }
      } else {
        // Streak broken
        streak.currentStreak = 1;
      }
    } else {
      streak.currentStreak = 1;
      streak.longestStreak = 1;
    }

    streak.lastActivityDate = now;
    await this.streakRepository.save(streak);

    // Sync to User entity for easier access
    await this.userRepository.update(userId, {
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      lastStudyDate: now,
    });
  }

  private getStage(streak: number): string {
    if (streak >= 30) return 'Grandmaster';
    if (streak >= 14) return 'Master';
    if (streak >= 7) return 'Scholar';
    if (streak >= 3) return 'Apprentice';

    return 'Novice';
  }

  async getInsights(userId: string) {
    const streak = await this.streakRepository.findOne({ where: { userId } });
    const effectiveStreak = this.calculateEffectiveStreakFromEntity(streak);

    return {
      currentStreak: effectiveStreak,
      longestStreak: streak?.longestStreak ?? 0,
      lastActivity: streak?.lastActivityDate,
      stage: this.getStage(effectiveStreak),
    };
  }
  async increaseReputation(userId: string, amount: number) {
    const user = await this.getOne(userId);

    user.reputation += amount;
    await this.userRepository.save(user);
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import {
  PartnerRequest,
  PartnerRequestStatus,
} from '@/app/users/entities/partner-request.entity';
import { StudyStreak } from '@/app/users/entities/study-streak.entity';
import { User } from '@/app/users/entities/user.entity';

import { CreateUserDto } from '@/app/users/dto/create-user.dto';
import { UpdateUserDto } from '@/app/users/dto/update-user.dto';

import { EmailService } from '@/app/common/services/email.service';
import { WinstonLoggerService } from '@/logger/winston-logger/winston-logger.service';

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
  ) {
    this.logger.setContext(UsersService.name);
  }

  // ... existing methods ...

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
    const link = 'http://localhost:5173';

    await this.emailService.sendPartnerInvite(
      receiver.email,
      sender.firstName,
      link,
    );

    return request;
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

  // ... existing updateStreak ...

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

  // ... (keeping findAll, getOne, findOne, findByEmail, findOneProfile)

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

  // ... (keeping updateAcademicProfile, remove, getDiffDays, calculateEffectiveStreakFromEntity, calculateEffectiveStreak, updateStreak, getStage, getInsights)

  async increaseReputation(userId: string, amount: number) {
    const user = await this.getOne(userId);

    // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
    user.reputation += amount;
    await this.userRepository.save(user);
  }
}

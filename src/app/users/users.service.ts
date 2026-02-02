import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';

import { Department } from '@/app/academic/entities/department.entity';
import { Faculty } from '@/app/academic/entities/faculty.entity';
import {
  PartnerRequest,
  PartnerRequestStatus,
} from '@/app/users/entities/partner-request.entity';
import { ReferralStatus } from '@/app/users/entities/referral.entity';
import { StudyStreak } from '@/app/users/entities/study-streak.entity';
import { User } from '@/app/users/entities/user.entity';
import { ReadingProgress } from '@/app/users/entities/reading-progress.entity';
import { ViewingHistory } from '@/app/users/entities/viewing-history.entity';

import { CreateUserDto } from '@/app/users/dto/create-user.dto';
import { UpdateAcademicProfileDto } from '@/app/users/dto/update-academic-profile.dto';
import { UpdateTimerSettingsDto } from '@/app/users/dto/update-timer-settings.dto';
import { UpdateUserDto } from '@/app/users/dto/update-user.dto';

import { EmailService } from '@/app/common/services/email.service';
import { WinstonLoggerService } from '@/logger/winston-logger/winston-logger.service';
import { PaginationService } from '@/pagination/pagination.service';
import { PushService } from '@/app/notifications/push.service';

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
    @InjectRepository(Department)
    private readonly departmentRepo: Repository<Department>,
    @InjectRepository(Faculty)
    private readonly facultyRepo: Repository<Faculty>,
    @InjectRepository(ReadingProgress)
    private readonly readingProgressRepo: Repository<ReadingProgress>,
    @InjectRepository(ViewingHistory)
    private readonly viewingHistoryRepo: Repository<ViewingHistory>,
    private readonly logger: WinstonLoggerService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    private readonly pushService: PushService,
  ) {
    this.logger.setContext(UsersService.name);
  }

  async invitePartner(userId: string, identifier: string) {
    const sender = await this.getOne(userId);

    // Try to find by username or email based on format
    const isEmail = identifier.includes('@');
    let receiver = isEmail
      ? await this.findByEmail(identifier.toLowerCase())
      : await this.findByUsername(identifier);

    if (!receiver) {
      if (isEmail) {
        throw new NotFoundException('User not found with that email');
      } else {
        throw new NotFoundException('No user found with that username. Try their email instead.');
      }
    }
    if (sender.id === receiver.id) throw new BadRequestException('Cannot invite yourself');
    // Removed single partner checks to allow multiple partners

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

    if (existingRequest) throw new ConflictException('Pending request already exists');

    const request = this.partnerRequestRepo.create({
      sender,
      receiver,
      status: PartnerRequestStatus.PENDING,
    });

    await this.partnerRequestRepo.save(request);

    // Send email
    // In a real app, generate a token/link. For now, just link to the app.
    const clientUrl = this.configService.get<string>('CLIENT_URL') ?? '';
    const link = `${clientUrl}/study-partner`;

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
    if (request.sender.id !== userId) throw new ForbiddenException('Not authorized');
    if (request.status !== PartnerRequestStatus.PENDING)
      throw new BadRequestException('Cannot cancel processed request');

    return this.partnerRequestRepo.remove(request);
  }

  async respondToRequest(requestId: string, userId: string, accept: boolean) {
    const request = await this.partnerRequestRepo.findOne({
      where: { id: requestId },
      relations: ['sender', 'receiver'],
    });

    if (!request) throw new NotFoundException('Request not found');
    if (request.receiver.id !== userId) throw new ForbiddenException('Not authorized');
    if (request.status !== PartnerRequestStatus.PENDING)
      throw new BadRequestException('Request already handled');

    if (accept) {
      request.status = PartnerRequestStatus.ACCEPTED;
      // No need to update partnerId on User entity anymore.
      // The PartnerRequest with status ACCEPTED serves as the link.

      // Send push notification to original sender
      if (request.sender.pushSubscription) {
        await this.pushService.sendPartnerAcceptedNotification(
          request.sender.pushSubscription,
          request.receiver.firstName,
        );
      }
    } else {
      request.status = PartnerRequestStatus.REJECTED;

      // Send notification to sender about rejection
      const clientUrl = this.configService.get<string>('CLIENT_URL') ?? '';
      const link = `${clientUrl}/study-partner`;

      await this.emailService.sendPartnerRejection(
        request.sender.email,
        request.receiver.firstName,
        link,
      );
    }

    return this.partnerRequestRepo.save(request);
  }

  async nudgePartner(userId: string, partnerId: string) {
    // Check if they are partners
    const request = await this.partnerRequestRepo.findOne({
      where: [
        {
          sender: { id: userId },
          receiver: { id: partnerId },
          status: PartnerRequestStatus.ACCEPTED,
        },
        {
          sender: { id: partnerId },
          receiver: { id: userId },
          status: PartnerRequestStatus.ACCEPTED,
        },
      ],
      relations: ['sender', 'receiver'],
    });

    if (!request) throw new BadRequestException('You are not partners with this user');

    // Check rate limit (e.g., 1 hour)
    if (request.lastNudgedAt) {
      const diff = Date.now() - request.lastNudgedAt.getTime();
      const hours = diff / (1000 * 60 * 60);

      if (hours < 1) {
        throw new BadRequestException('You can only nudge a partner once per hour');
      }
    }

    const sender =
      request.sender.id === userId ? request.sender : request.receiver;
    const receiver =
      request.sender.id === userId ? request.receiver : request.sender;

    // Send email
    await this.emailService.sendNudge(
      receiver.email,
      sender.firstName,
      `${sender.firstName} sent you a study nudge!`,
    );

    // Send push notification if receiver has subscription
    if (receiver.pushSubscription) {
      await this.pushService.sendNudgeNotification(
        receiver.pushSubscription,
        sender.firstName,
      );
    }

    request.lastNudgedAt = new Date();
    await this.partnerRequestRepo.save(request);

    return { success: true };
  }

  async getPartnerStats(userId: string) {
    // Find all accepted requests where user is sender or receiver
    const requests = await this.partnerRequestRepo.find({
      where: [
        { sender: { id: userId }, status: PartnerRequestStatus.ACCEPTED },
        { receiver: { id: userId }, status: PartnerRequestStatus.ACCEPTED },
      ],
      relations: ['sender', 'receiver'],
    });

    if (requests.length === 0) return [];

    const partnersData = await Promise.all(
      requests.map(async (req) => {
        const partner = req.sender.id === userId ? req.receiver : req.sender;

        const partnerStreak = await this.streakRepository.findOne({
          where: { userId: partner.id },
        });

        const userEffectiveStreak = await this.calculateEffectiveStreak(userId);
        const partnerEffectiveStreak =
          this.calculateEffectiveStreakFromEntity(partnerStreak);

        return {
          id: partner.id,
          firstName: partner.firstName,
          lastName: partner.lastName,
          email: partner.email,
          image: partner.image,
          currentStreak: partnerEffectiveStreak,
          lastActivity: partnerStreak?.lastActivityDate,
          combinedStreak: Math.min(userEffectiveStreak, partnerEffectiveStreak),
        };
      }),
    );

    return partnersData;
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

    // Transform user to include full department/faculty objects
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const responseUser: any = Object.assign({}, user);

    if (user.department) {
      const dept = await this.departmentRepo.findOne({
        where: { name: user.department },
      });

      if (dept) {
        responseUser.department = { id: dept.id, name: dept.name };
      }
    }

    if (user.faculty) {
      const faculty = await this.facultyRepo.findOne({
        where: { name: user.faculty },
      });

      if (faculty) {
        responseUser.faculty = { id: faculty.id, name: faculty.name };
      }
    }

    return new SuccessResponse('User retrieved', responseUser);
  }

  findByEmail(email: string) {
    return this.userRepository.findOne({ where: { email: email.toLowerCase() } });
  }

  findByUsername(username: string) {
    return this.userRepository.findOne({ where: { username: username.toLowerCase() } });
  }

  findByVerificationToken(token: string) {
    return this.userRepository.findOne({ where: { verificationToken: token } });
  }

  findByResetToken(token: string) {
    return this.userRepository.findOne({
      where: { resetPasswordToken: token },
    });
  }

  save(user: User) {
    return this.userRepository.save(user);
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
    this.logger.log(
      `Updating academic profile for user ${id}: ${JSON.stringify(dto)}`,
    );
    const user = await this.getOne(id);

    // Check for 9-month restriction
    if (user.lastProfileUpdate) {
      const nineMonthsInMs = 9 * 30 * 24 * 60 * 60 * 1000; // Approx 9 months
      const timeSinceLastUpdate = Date.now() - user.lastProfileUpdate.getTime();

      if (timeSinceLastUpdate < nineMonthsInMs) {
        const remainingTime = Math.ceil(
          (nineMonthsInMs - timeSinceLastUpdate) / (1000 * 60 * 60 * 24),
        );

        throw new ForbiddenException(
          `You can only update your academic profile once every 9 months. Please wait ${String(remainingTime)} more days.`,
        );
      }
    }

    if (dto.schoolId) {
      user.school = dto.schoolId;
      user.schoolId = dto.schoolId; // Set FK for multi-university scoping
    }

    if (dto.facultyId) {
      user.faculty = dto.facultyId;
    }

    if (dto.departmentId) {
      user.department = dto.departmentId;
    }

    if (dto.yearOfStudy) {
      user.yearOfStudy = dto.yearOfStudy;
    }

    user.lastProfileUpdate = new Date();

    const savedUser = await this.userRepository.save(user);

    this.logger.log(
      `Saved user profile: ${JSON.stringify({ faculty: savedUser.faculty, department: savedUser.department })}`,
    );

    return savedUser;
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
      weeklyActiveDays: 0,
      streakFreezes: 0,
    });

    const now = new Date();

    // Check if it's a new week (Monday start)
    const isNewWeek = this.isNewWeek(streak.weekStartDate, now);
    if (isNewWeek) {
      // Award freezes based on last week's activity before resetting
      if (streak.weeklyActiveDays >= 7) {
        streak.streakFreezes += 2;
      } else if (streak.weeklyActiveDays >= 5) {
        streak.streakFreezes += 1;
      }
      // Reset weekly counter for new week
      streak.weeklyActiveDays = 0;
      streak.weekStartDate = this.getWeekStart(now);
    }

    if (streak.lastActivityDate) {
      const diffDays = this.getDiffDays(now, streak.lastActivityDate);

      if (diffDays === 0) {
        // Same day, do nothing to streak, but we're still active this day
      } else if (diffDays === 1) {
        // Consecutive day - increment streak and weekly counter
        streak.currentStreak += 1;
        streak.weeklyActiveDays += 1;

        if (streak.currentStreak > streak.longestStreak) {
          streak.longestStreak = streak.currentStreak;
        }
      } else {
        // Gap of 2+ days - streak would break
        if (streak.streakFreezes > 0) {
          // Use a freeze to preserve the streak
          streak.streakFreezes -= 1;
          streak.currentStreak += 1; // Continue the streak
          streak.weeklyActiveDays += 1;

          if (streak.currentStreak > streak.longestStreak) {
            streak.longestStreak = streak.currentStreak;
          }
        } else {
          // No freezes available - streak breaks
          streak.currentStreak = 1;
          streak.weeklyActiveDays += 1;
        }
      }
    } else {
      // First activity ever
      streak.currentStreak = 1;
      streak.longestStreak = 1;
      streak.weeklyActiveDays = 1;
      streak.weekStartDate = this.getWeekStart(now);
    }

    streak.lastActivityDate = now;
    await this.streakRepository.save(streak);

    // Sync to User entity for easier access
    await this.userRepository.update(userId, {
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      lastStudyDate: now,
    });

    return {
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      streakFreezes: streak.streakFreezes,
      weeklyActiveDays: streak.weeklyActiveDays,
    };
  }

  // Check if we're in a new week compared to the stored week start
  private isNewWeek(storedWeekStart: Date | null, now: Date): boolean {
    if (!storedWeekStart) return true;
    const currentWeekStart = this.getWeekStart(now);
    return currentWeekStart.getTime() !== new Date(storedWeekStart).getTime();
  }

  // Get the Monday of the current week
  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
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
      streakFreezes: streak?.streakFreezes ?? 0,
      weeklyActiveDays: streak?.weeklyActiveDays ?? 0,
    };
  }
  async increaseReputation(userId: string, amount: number) {
    const user = await this.getOne(userId);

    user.reputation += amount;
    await this.userRepository.save(user);
  }

  async updateActivity(userId: string, materialId: string, page: number) {
    // Update per-material reading progress (upsert)
    const existing = await this.readingProgressRepo.findOne({
      where: { userId, materialId },
    });

    if (existing) {
      existing.lastPage = page;
      await this.readingProgressRepo.save(existing);
    } else {
      const progress = this.readingProgressRepo.create({
        userId,
        materialId,
        lastPage: page,
      });
      await this.readingProgressRepo.save(progress);
    }

    // Also update user's last read material for backwards compatibility
    await this.userRepository.update(userId, {
      lastReadMaterialId: materialId,
      lastReadPage: page,
    });
  }

  async getActivity(userId: string, materialId?: string) {
    // Helper to strip content from material (avoid logging sensitive data)
    const stripContent = (material: any) => {
      if (!material) return null;
      const { content, ...rest } = material;
      return rest;
    };

    // If materialId provided, get progress for that specific material
    if (materialId) {
      const progress = await this.readingProgressRepo.findOne({
        where: { userId, materialId },
        relations: ['material', 'material.uploader'],
      });

      if (progress) {
        return {
          lastReadMaterialId: materialId,
          lastReadMaterial: stripContent(progress.material),
          lastReadPage: progress.lastPage,
        };
      }

      // No progress for this material yet
      return {
        lastReadMaterialId: materialId,
        lastReadMaterial: null,
        lastReadPage: 1,
      };
    }

    // No materialId: return most recent activity (backwards compatible)
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['lastReadMaterial', 'lastReadMaterial.uploader'],
    });

    if (!user) throw new NotFoundException('User not found');

    return {
      lastReadMaterialId: user.lastReadMaterialId,
      lastReadMaterial: stripContent(user.lastReadMaterial),
      lastReadPage: user.lastReadPage,
    };
  }

  async getTimerSettings(userId: string) {
    const user = await this.getOne(userId);

    return {
      studyDuration: user.studyDuration ?? 1500, // 25 minutes default
      testDuration: user.testDuration ?? 300, // 5 minutes default
      restDuration: user.restDuration ?? 600, // 10 minutes default
    };
  }

  async updateTimerSettings(userId: string, dto: UpdateTimerSettingsDto) {
    const user = await this.getOne(userId);

    if (dto.studyDuration !== undefined) {
      user.studyDuration = dto.studyDuration;
    }
    if (dto.testDuration !== undefined) {
      user.testDuration = dto.testDuration;
    }
    if (dto.restDuration !== undefined) {
      user.restDuration = dto.restDuration;
    }

    await this.userRepository.save(user);

    return {
      studyDuration: user.studyDuration,
      testDuration: user.testDuration,
      restDuration: user.restDuration,
    };
  }

  /**
   * Get leaderboard data for admin dashboard
   * Returns top 10 users in various categories
   */
  async getLeaderboards() {
    // Top by reputation
    const topReputation = await this.userRepository
      .createQueryBuilder('user')
      .select(['user.id', 'user.firstName', 'user.lastName', 'user.email', 'user.reputation'])
      .orderBy('user.reputation', 'DESC')
      .limit(10)
      .getMany();

    // Top by uploads (need to count materials)
    // Use lowercase alias to avoid PostgreSQL case sensitivity issues
    const topUploaders = await this.userRepository
      .createQueryBuilder('user')
      .leftJoin('user.materials', 'material')
      .select(['user.id', 'user.firstName', 'user.lastName', 'user.email'])
      .addSelect('COUNT(material.id)', 'upload_count')
      .groupBy('user.id')
      .orderBy('"upload_count"', 'DESC')
      .limit(10)
      .getRawMany();

    // Top by referrals (count completed referrals)
    // Use raw SQL subquery to avoid TypeORM adding deleted_at filter on referral table
    const topReferrers = await this.userRepository
      .createQueryBuilder('user')
      .select(['user.id', 'user.firstName', 'user.lastName', 'user.email'])
      .addSelect(`(
        SELECT COUNT(*) FROM referral r 
        WHERE r.referrer_id = user.id AND r.status = 'completed'
      )`, 'referral_count')
      .having(`(
        SELECT COUNT(*) FROM referral r 
        WHERE r.referrer_id = user.id AND r.status = 'completed'
      ) > 0`)
      .groupBy('user.id')
      .orderBy('"referral_count"', 'DESC')
      .limit(10)
      .getRawMany();

    // Top by current streak
    const topStreaks = await this.streakRepository
      .createQueryBuilder('streak')
      .leftJoin('streak.user', 'user')
      .select([
        'user.id AS user_id',
        'user.firstName AS first_name',
        'user.lastName AS last_name',
        'user.email AS email',
        'streak.currentStreak AS current_streak',
        'streak.longestStreak AS longest_streak',
      ])
      .orderBy('streak.currentStreak', 'DESC')
      .limit(10)
      .getRawMany();

    return {
      reputation: topReputation.map(u => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName}`,
        email: u.email,
        value: u.reputation,
      })),
      uploaders: topUploaders.map(u => ({
        id: u.user_id,
        name: `${u.user_first_name} ${u.user_last_name}`,
        email: u.user_email,
        value: parseInt(u.upload_count) || 0,
      })),
      referrers: topReferrers.map(u => ({
        id: u.user_id,
        name: `${u.user_first_name} ${u.user_last_name}`,
        email: u.user_email,
        value: parseInt(u.referral_count) || 0,
      })),
      streaks: topStreaks.map(s => ({
        id: s.user_id,
        name: s.first_name ? `${s.first_name} ${s.last_name}` : 'Unknown',
        email: s.email,
        value: s.current_streak,
        longest: s.longest_streak,
      })),
    };
  }

  // ==================== Viewing History ====================

  /**
   * Record a material view for the user's viewing history
   * Creates new entry or updates existing one with new timestamp/page
   */
  async recordView(userId: string, materialId: string, lastPage = 1) {
    // Check if entry already exists for this user+material
    let entry = await this.viewingHistoryRepo.findOne({
      where: {
        user: { id: userId },
        material: { id: materialId },
      },
    });

    if (entry) {
      // Update existing entry
      entry.lastPage = lastPage;
      entry.viewedAt = new Date();
    } else {
      // Create new entry
      entry = this.viewingHistoryRepo.create({
        user: { id: userId },
        material: { id: materialId },
        lastPage,
      });
    }

    await this.viewingHistoryRepo.save(entry);
    return { success: true };
  }

  /**
   * Get user's viewing history (most recent first)
   * Returns materials with their metadata for "Recently Opened" feature
   */
  async getViewingHistory(userId: string, limit = 10) {
    const history = await this.viewingHistoryRepo.find({
      where: { user: { id: userId } },
      relations: ['material', 'material.uploader'],
      order: { viewedAt: 'DESC' },
      take: limit,
    });

    return history.map(h => ({
      id: h.material.id,
      title: h.material.title,
      type: h.material.type,
      courseCode: h.material.courseCode,
      lastPage: h.lastPage,
      viewedAt: h.viewedAt,
      uploader: h.material.uploader ? {
        id: h.material.uploader.id,
        firstName: h.material.uploader.firstName,
        lastName: h.material.uploader.lastName,
      } : undefined,
    }));
  }

  /**
   * Remove a material from viewing history (e.g., when material is deleted)
   */
  async removeFromViewingHistory(userId: string, materialId: string) {
    await this.viewingHistoryRepo.delete({
      user: { id: userId },
      material: { id: materialId },
    });
    return { success: true };
  }

  // ==================== User Preferences ====================

  /**
   * Get user preferences (feature flags, UI settings)
   */
  async getPreferences(userId: string): Promise<Record<string, any>> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['preferences'],
    });
    return user?.preferences || {};
  }

  /**
   * Update user preferences (merge with existing)
   */
  async updatePreferences(userId: string, updates: Record<string, any>) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Merge new preferences with existing
    user.preferences = {
      ...(user.preferences || {}),
      ...updates,
    };

    await this.userRepository.save(user);
    return user.preferences;
  }

  // ===== Push Notification Subscriptions =====

  async savePushSubscription(
    userId: string,
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  ) {
    const user = await this.getOne(userId);
    user.pushSubscription = subscription;
    await this.userRepository.save(user);
    return { success: true, message: 'Push subscription saved' };
  }

  async removePushSubscription(userId: string) {
    const user = await this.getOne(userId);
    user.pushSubscription = null;
    await this.userRepository.save(user);
    return { success: true, message: 'Push subscription removed' };
  }
}


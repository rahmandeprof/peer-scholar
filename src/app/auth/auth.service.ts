import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';

import { GoogleOAuthUser } from './strategies/google.strategy';

import { Referral, ReferralStatus } from '@/app/users/entities/referral.entity';
import { User } from '@/app/users/entities/user.entity';

import { CreateUserDto } from '@/app/users/dto/create-user.dto';

import { EmailService } from '@/app/common/services/email.service';
import { UsersService } from '@/app/users/users.service';

import * as bcrypt from 'bcrypt';
import { Request } from 'express';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

// Typed request with Google OAuth user
interface GoogleAuthRequest extends Request {
  user: GoogleOAuthUser;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private emailService: EmailService,
    @InjectRepository(Referral)
    private referralRepo: Repository<Referral>,
  ) {}

  async validateUser(
    email: string,
    pass: string,
  ): Promise<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    department: string;
    yearOfStudy: number;
  } | null> {
    const user = await this.usersService.findByEmail(email);

    if (user && !user.password && user.googleId) {
      throw new BadRequestException(
        'This account was created with Google. Please sign in with Google.',
      );
    }

    if (user?.password && (await bcrypt.compare(pass, user.password))) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user;

      return {
        ...result,
        department: user.department || '',
      } as {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        department: string;
        yearOfStudy: number;
      };
    }

    return null;
  }

  async login(
    user:
      | User
      | Omit<User, 'password'>
      | {
          id: string;
          email: string;
          firstName: string;
          lastName: string;
          department: string;
          faculty?: string;
          school?: string;
          schoolId?: string;
          yearOfStudy: number;
        },
  ) {
    // Update streak on login and get fresh values
    const streak = await this.usersService.updateStreak(user.id);

    await this.usersService.updateLastSeen(user.id);

    // Login tracking: alert when watched user logs in
    if (user.email === 'cybershaykh@intigiriti.me') {
      this.emailService
        .sendLoginAlertDirect(
          'abdulrahmanabdulsalam93@gmail.com',
          `${user.firstName} ${user.lastName}`,
          user.email,
          new Date(),
        )
        .catch(() => {
          // ignore error
        });
    }

    const payload = {
      email: user.email,
      sub: user.id,
      department: user.department,
      yearOfStudy: user.yearOfStudy,
    };

    return {
      access_token: this.jwtService.sign(payload, {
        expiresIn: '365d', // Effectively permanent - one academic year
      }),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        department: user.department,
        faculty: user.faculty,
        school: user.school,
        schoolId: user.schoolId,
        yearOfStudy: user.yearOfStudy,
        currentStreak: streak.currentStreak,
        longestStreak: streak.longestStreak,
      },
    };
  }

  async register(userData: CreateUserDto) {
    // Check if user already exists to prevent duplicate key constraint violation
    const existingUser = await this.usersService.findByEmail(userData.email);

    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const verificationToken = uuidv4();

    // Validate referral code if provided
    let referrerId: string | null = null;

    if (userData.referralCode) {
      try {
        const referrer = await this.usersService.getOne(userData.referralCode);

        referrerId = referrer.id;
      } catch {
        this.logger.warn(`Invalid referral code: ${userData.referralCode}`);
      }
    }

    const userDataPlain = {
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      school: userData.school,
      schoolId: userData.schoolId,
      department: userData.department,
      faculty: userData.faculty,
      yearOfStudy: userData.yearOfStudy,
      password: hashedPassword,
      verificationToken,
      isVerified: false,
      referredById: referrerId,
    };
    const newUser = await this.usersService.create(userDataPlain);

    // Create referral record if valid referrer exists
    if (referrerId) {
      await this.referralRepo.save({
        referrerId,
        refereeId: newUser.id,
        status: ReferralStatus.PENDING,
        pointsAwarded: 0,
      });
      this.logger.log(`Referral created: ${referrerId} referred ${newUser.id}`);
    }

    await this.emailService.sendEmailVerificationDirect(
      newUser,
      verificationToken,
    );

    return this.login(newUser);
  }

  async verifyEmail(token: string) {
    const user = await this.usersService.findByVerificationToken(token);

    if (!user) {
      throw new BadRequestException('Invalid verification token');
    }

    user.emailVerified = true;
    user.isVerified = true;
    user.verificationToken = null;

    await this.usersService.save(user);

    // Complete referral and award points if this user was referred
    if (user.referredById) {
      const referral = await this.referralRepo.findOne({
        where: { refereeId: user.id, status: ReferralStatus.PENDING },
      });

      if (referral) {
        const REFERRAL_REWARD = 50; // Points for successful referral

        referral.status = ReferralStatus.COMPLETED;
        referral.pointsAwarded = REFERRAL_REWARD;
        referral.completedAt = new Date();
        await this.referralRepo.save(referral);

        // Award points to referrer
        await this.usersService.increaseReputation(
          user.referredById,
          REFERRAL_REWARD,
        );
        this.logger.log(
          `Awarded ${REFERRAL_REWARD} points to referrer ${user.referredById} for referring ${user.id}`,
        );
      }
    }

    return { success: true, message: 'Email verified successfully' };
  }

  async resendVerification(userId: string) {
    const user = await this.usersService.getOne(userId);

    if (user.isVerified) {
      throw new BadRequestException('Email already verified');
    }

    const verificationToken = uuidv4();

    user.verificationToken = verificationToken;
    await this.usersService.save(user);

    await this.emailService.sendEmailVerificationDirect(
      user,
      verificationToken,
    );

    return { success: true, message: 'Verification email sent' };
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      return {
        success: true,
        message:
          'If your email is registered, you will receive a password reset link.',
      };
    }

    const token = uuidv4();

    user.resetPasswordToken = token;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour

    await this.usersService.save(user);

    const clientUrl = process.env.CLIENT_URL ?? 'http://localhost:5173';
    const link = `${clientUrl}/reset-password?token=${token}`;

    await this.emailService.sendForgotPasswordDirect(
      user.email,
      user.firstName,
      link,
    );

    return {
      success: true,
      message:
        'If your email is registered, you will receive a password reset link.',
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.usersService.findByResetToken(token);

    if (!user?.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;

    await this.usersService.save(user);

    return { success: true, message: 'Password reset successfully' };
  }

  async googleLogin(req: GoogleAuthRequest) {
    if (!req.user) {
      throw new BadRequestException(
        'Google authentication failed - no user data received',
      );
    }

    const { email, firstName, lastName, picture, googleId } = req.user;

    let user = await this.usersService.findByEmail(email || '');

    if (!user) {
      // Create new user
      const userData: Partial<CreateUserDto> = {
        email: email ?? '',
        firstName: firstName ?? 'User',
        lastName: lastName ?? '',
        image: picture ?? undefined,
        googleId,
        password: undefined, // No password for google users
        department: 'General', // Default
        yearOfStudy: 1, // Default
      };

      user = await this.usersService.create(userData as CreateUserDto);
    } else if (!user.googleId) {
      // Link existing user and mark as verified
      await this.usersService.update(user.id, {
        googleId,
        image: picture ?? undefined,
        isVerified: true,
      });
      user.googleId = googleId;
      user.isVerified = true;
    }

    return this.login(user);
  }
}

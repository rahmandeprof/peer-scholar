import { BadRequestException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { User } from '@/app/users/entities/user.entity';

import { CreateUserDto } from '@/app/users/dto/create-user.dto';

import { EmailService } from '@/app/common/services/email.service';
import { UsersService } from '@/app/users/users.service';

import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) { }

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
        yearOfStudy: number;
      },
  ) {
    // Update streak on login and get fresh values
    const streak = await this.usersService.updateStreak(user.id);

    const payload = {
      email: user.email,
      sub: user.id,
      department: user.department,
      yearOfStudy: user.yearOfStudy,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        department: user.department,
        faculty: user.faculty,
        school: user.school,
        yearOfStudy: user.yearOfStudy,
        currentStreak: streak.currentStreak,
        longestStreak: streak.longestStreak,
      },
    };
  }

  async register(userData: CreateUserDto) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const verificationToken = uuidv4();

    const userDataPlain = {
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      department: userData.department,
      faculty: userData.faculty,
      yearOfStudy: userData.yearOfStudy,
      password: hashedPassword,
      verificationToken,
      isVerified: false,
    };
    const newUser = await this.usersService.create(userDataPlain);

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async googleLogin(req: any) {
    if (!req.user) {
      return 'No user from google';
    }

    const { email, firstName, lastName, picture, googleId } = req.user;

    let user = await this.usersService.findByEmail(email);

    if (!user) {
      // Create new user
      const userData = {
        email: email ?? '',
        firstName: firstName ?? 'User',
        lastName: lastName ?? '',
        image: picture ?? null,
        googleId,
        password: null, // No password for google users
        department: 'General', // Default
        yearOfStudy: 1, // Default
        isVerified: true, // Google users are verified by default
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      user = await this.usersService.create(userData as any);
    } else if (!user.googleId) {
      // Link existing user and mark as verified
      await this.usersService.update(user.id, { googleId, image: picture, isVerified: true });
      user.googleId = googleId;
      user.isVerified = true;
    }

    return this.login(user);
  }
}

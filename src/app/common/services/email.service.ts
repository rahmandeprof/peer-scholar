import { InjectQueue } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';

import { OTP } from '@/app/otp/entities/otp.entity';
import { User } from '@/app/users/entities/user.entity';

import { Queue } from 'bull';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(EmailService.name);
  private readonly fromAddress: string;

  constructor(@InjectQueue('email') private emailQueue: Queue) {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT ?? '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    // Smart FROM address: use SMTP_FROM if set, otherwise fall back to SMTP_USER
    this.fromAddress = process.env.SMTP_FROM ||
      (process.env.SMTP_USER ? `"PeerScholar" <${process.env.SMTP_USER}>` : '"PeerScholar" <noreply@peertolearn.com>');

    this.logger.log(`Email service initialized. FROM address: ${this.fromAddress}`);
  }

  /**
   * Get the configured FROM address for all emails
   */
  private getFromAddress(): string {
    return this.fromAddress;
  }

  async sendPartnerInvite(to: string, inviterName: string, acceptLink: string) {
    await this.emailQueue.add('send-partner-invite', {
      to,
      inviterName,
      acceptLink,
    });
  }

  async sendPartnerInviteDirect(
    to: string,
    inviterName: string,
    acceptLink: string,
  ) {
    try {
      await this.transporter.sendMail({
        from: this.getFromAddress(),
        to,
        subject: `${inviterName} wants to be your study partner!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #4F46E5;">Study Partner Request</h2>
            <p>Hi there,</p>
            <p><strong>${inviterName}</strong> has invited you to be their study partner on PeerToLearn.</p>
            <p>Studying with a partner helps you stay motivated and maintain your streak!</p>
            <div style="margin: 30px 0;">
              <a href="${acceptLink}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Accept Invitation</a>
            </div>
            <p style="color: #666; font-size: 12px;">If you didn't request this, you can safely ignore this email.</p>
          </div>
        `,
      });
      this.logger.log(`Invite email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}`, error);
    }
  }

  async sendNudge(to: string, senderName: string, message: string) {
    await this.emailQueue.add('send-nudge', {
      to,
      senderName,
      message,
    });
  }

  async sendNudgeDirect(to: string, senderName: string, message: string) {
    try {
      await this.transporter.sendMail({
        from: this.getFromAddress(),
        to,
        subject: `⚡ Study Nudge from ${senderName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #F59E0B;">⚡ Study Nudge!</h2>
            <p>Hi there,</p>
            <p><strong>${senderName}</strong> sent you a nudge to remind you to study!</p>
            <p style="font-size: 16px; padding: 15px; background-color: #f9fafb; border-radius: 5px;">"${message}"</p>
            <p>Don't break your streak! Log in now and complete a study session.</p>
            <div style="margin: 30px 0;">
              <a href="${process.env.CLIENT_URL ?? ''}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Go to Dashboard</a>
            </div>
          </div>
        `,
      });
      this.logger.log(`Nudge email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send nudge to ${to}`, error);
    }
  }

  async sendPartnerRejection(to: string, senderName: string, link: string) {
    await this.emailQueue.add('send-partner-rejection', {
      to,
      senderName,
      link,
    });
  }

  async sendPartnerRejectionDirect(
    to: string,
    senderName: string,
    link: string,
  ) {
    try {
      await this.transporter.sendMail({
        from: this.getFromAddress(),
        to,
        subject: `Update on your study partner request`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #EF4444;">Request Update</h2>
            <p>Hi there,</p>
            <p><strong>${senderName}</strong> has declined your study partner request.</p>
            <p>Don't be discouraged! There are many other students looking for partners.</p>
            <div style="margin: 30px 0;">
              <a href="${link}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Find New Partners</a>
            </div>
          </div>
        `,
      });
      this.logger.log(`Rejection email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send rejection email to ${to}`, error);
    }
  }

  async queueResetPassword(user: User, resetToken: string) {
    await this.emailQueue.add('send-reset-password', {
      user,
      resetToken,
    });
  }

  async queueOtp(user: User, otp: OTP) {
    await this.emailQueue.add('send-otp', {
      user,
      otp,
    });
  }

  async queueEmailVerification(user: User, verificationToken: string) {
    await this.emailQueue.add('send-email-verification', {
      user,
      verificationToken,
    });
  }

  async sendEmailVerificationDirect(user: User, verificationToken: string) {
    const clientUrl = process.env.CLIENT_URL ?? 'http://localhost:5173';
    const link = `${clientUrl}/verify-email?token=${verificationToken}`;

    try {
      await this.transporter.sendMail({
        from: this.getFromAddress(),
        to: user.email,
        subject: 'Verify your email address',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #4F46E5;">Welcome to PeerToLearn!</h2>
            <p>Hi ${user.firstName},</p>
            <p>Please verify your email address to unlock full access to PeerToLearn features like uploading materials and commenting.</p>
            <div style="margin: 30px 0;">
              <a href="${link}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Verify Email</a>
            </div>
            <p style="color: #666; font-size: 12px;">If you didn't create an account, you can safely ignore this email.</p>
          </div>
        `,
      });
      this.logger.log(`Verification email sent to ${user.email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send verification email to ${user.email}`,
        error,
      );
    }
  }

  async sendForgotPasswordDirect(to: string, name: string, link: string) {
    try {
      await this.transporter.sendMail({
        from: this.getFromAddress(),
        to,
        subject: 'Reset your password',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #4F46E5;">Reset Password</h2>
            <p>Hi ${name},</p>
            <p>You requested to reset your password.</p>
            <div style="margin: 30px 0;">
              <a href="${link}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
            </div>
            <p>This link will expire in 1 hour.</p>
            <p style="color: #666; font-size: 12px;">If you didn't request this, please ignore this email.</p>
          </div>
        `,
      });
      this.logger.log(`Forgot password email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send forgot password email to ${to}`, error);
    }
  }
}

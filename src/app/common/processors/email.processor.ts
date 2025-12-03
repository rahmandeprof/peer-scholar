import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';

import { OTP } from '@/app/otp/entities/otp.entity';
import { User } from '@/app/users/entities/user.entity';

import { EmailService } from '../services/email.service';
import { MailService } from '@/mail/mail.service';

import { Job } from 'bull';

@Processor('email')
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly mailService: MailService,
  ) {}

  @Process('send-partner-invite')
  async handlePartnerInvite(
    job: Job<{ to: string; inviterName: string; acceptLink: string }>,
  ) {
    const { to, inviterName, acceptLink } = job.data;

    this.logger.debug(`Processing partner invite for ${to}`);
    await this.emailService.sendPartnerInviteDirect(
      to,
      inviterName,
      acceptLink,
    );
  }

  @Process('send-nudge')
  async handleNudge(
    job: Job<{ to: string; senderName: string; message: string }>,
  ) {
    const { to, senderName, message } = job.data;

    this.logger.debug(`Processing nudge for ${to}`);
    await this.emailService.sendNudgeDirect(to, senderName, message);
  }

  @Process('send-partner-rejection')
  async handlePartnerRejection(
    job: Job<{ to: string; senderName: string; link: string }>,
  ) {
    const { to, senderName, link } = job.data;

    this.logger.debug(`Processing partner rejection for ${to}`);
    await this.emailService.sendPartnerRejectionDirect(to, senderName, link);
  }

  @Process('send-reset-password')
  async handleResetPassword(job: Job<{ user: User; resetToken: string }>) {
    const { user, resetToken } = job.data;

    this.logger.debug(`Processing password reset for ${user.email}`);
    await this.mailService.sendResetPassword(user, resetToken);
  }

  @Process('send-otp')
  async handleOtp(job: Job<{ user: User; otp: OTP }>) {
    const { user, otp } = job.data;

    this.logger.debug(`Processing OTP for ${user.email}`);
    await this.mailService.sendOtp(user, otp);
  }

  @Process('send-email-verification')
  async handleEmailVerification(
    job: Job<{ user: User; verificationToken: string }>,
  ) {
    const { user, verificationToken } = job.data;

    this.logger.debug(`Processing email verification for ${user.email}`);
    await this.mailService.sendEmailVerification(user, verificationToken);
  }
}

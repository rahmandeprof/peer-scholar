import { Injectable, Logger } from '@nestjs/common';

import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(EmailService.name);

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  async sendPartnerInvite(to: string, inviterName: string, acceptLink: string) {
    try {
      await this.transporter.sendMail({
        from:
          process.env.SMTP_FROM || '"PeerScholar" <noreply@peerscholar.com>',
        to,
        subject: `${inviterName} wants to be your study partner!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #4F46E5;">Study Partner Request</h2>
            <p>Hi there,</p>
            <p><strong>${inviterName}</strong> has invited you to be their study partner on PeerScholar.</p>
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
      // Don't throw, just log. We don't want to block the request if email fails.
    }
  }
}

import { BullModule } from '@nestjs/bull';
import { Global, Module } from '@nestjs/common';

import { MailModule } from '@/mail/mail.module';

import { CloudinaryService } from './services/cloudinary.service';
import { EmailService } from './services/email.service';

import { EmailProcessor } from './processors/email.processor';

@Global()
@Module({
  imports: [
    BullModule.registerQueue({
      name: 'email',
    }),
    MailModule,
  ],
  providers: [CloudinaryService, EmailService, EmailProcessor],
  exports: [CloudinaryService, EmailService, BullModule],
})
export class CommonModule {}

import { BullModule } from '@nestjs/bull';
import { Global, Module } from '@nestjs/common';

import { MailModule } from '@/mail/mail.module';

import { CloudinaryService } from './services/cloudinary.service';
import { EmailService } from './services/email.service';

import { EmailProcessor } from './processors/email.processor';

import { ConversionService } from './services/conversion.service';

@Global()
@Module({
  imports: [
    BullModule.registerQueue({
      name: 'email',
    }),
    MailModule,
  ],
  providers: [
    CloudinaryService,
    EmailService,
    EmailProcessor,
    ConversionService,
  ],
  exports: [CloudinaryService, EmailService, BullModule, ConversionService],
})
export class CommonModule {}

import { BullModule } from '@nestjs/bull';
import { Global, Module } from '@nestjs/common';

import { MailModule } from '@/mail/mail.module';

import { CloudinaryService } from './services/cloudinary.service';
import { R2Service } from './services/r2.service';
import { StorageService } from './services/storage.service';
import { ConversionService } from './services/conversion.service';
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
  providers: [
    CloudinaryService,
    R2Service,
    StorageService,
    EmailService,
    EmailProcessor,
    ConversionService,
  ],
  exports: [CloudinaryService, R2Service, StorageService, EmailService, BullModule, ConversionService],
})
export class CommonModule { }


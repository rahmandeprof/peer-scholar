import { Global, Module } from '@nestjs/common';

import { CloudinaryService } from './services/cloudinary.service';

import { EmailService } from './services/email.service';

@Global()
@Module({
  providers: [CloudinaryService, EmailService],
  exports: [CloudinaryService, EmailService],
})
export class CommonModule { }

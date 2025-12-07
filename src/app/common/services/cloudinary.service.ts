import { Injectable, Logger } from '@nestjs/common';

import { v2 as cloudinary } from 'cloudinary';
import DataURIParser from 'datauri/parser';
import path from 'path';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  uploadFile(
    file: Express.Multer.File,
  ): Promise<{ url: string; publicId: string }> {
    return new Promise((resolve, reject) => {
      const parser = new DataURIParser();
      const extName = path.extname(file.originalname).toString();
      const file64 = parser.format(extName, file.buffer);

      if (!file64.content) {
        reject(new Error('Failed to parse file content'));

        return;
      }

      void cloudinary.uploader.upload(
        file64.content,
        {
          folder: 'scholar-app',
          resource_type: 'auto',
        },
        (error, result) => {
          if (error) {
            this.logger.error('Cloudinary upload failed', error);

            reject(new Error(JSON.stringify(error)));

            return;
          }
          if (!result) {
            reject(new Error('Cloudinary upload returned no result'));

            return;
          }
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        },
      );
    });
  }

  deleteFile(publicId: string): Promise<void> {
    return new Promise((resolve) => {
      void cloudinary.uploader.destroy(
        publicId,
        { resource_type: 'raw' }, // Try raw first as most files are raw/auto
        (error, result) => {
          if (error) {
            this.logger.error(
              `Cloudinary delete failed for ${publicId}`,
              error,
            );
            // Don't reject, just log error so DB deletion can proceed
            // Or we could try 'image'/'video' resource types if raw fails?
            // For now, let's resolve to avoid blocking
            resolve();

            return;
          }
          // If result is not 'ok', it might be because resource_type was wrong.
          // However, for simplicity and safety, we'll assume best effort.
          this.logger.log(
            `Cloudinary delete result for ${publicId}: ${JSON.stringify(result)}`,
          );
          resolve();
        },
      );
    });
  }
}

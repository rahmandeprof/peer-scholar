import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { CloudinaryService } from './cloudinary.service';
import { R2Service } from './r2.service';

export type StorageProvider = 'cloudinary' | 'r2';

/**
 * StorageService - Unified Storage Abstraction
 *
 * Provides a single interface for file storage that can switch between
 * Cloudinary and Cloudflare R2 based on configuration.
 *
 * Set STORAGE_PROVIDER env var to 'cloudinary' or 'r2' (default: 'cloudinary')
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly provider: StorageProvider;

  constructor(
    private readonly configService: ConfigService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly r2Service: R2Service,
  ) {
    const configuredProvider = this.configService.get<string>(
      'STORAGE_PROVIDER',
    ) as StorageProvider;

    // Default to cloudinary for backwards compatibility
    this.provider = configuredProvider === 'r2' ? 'r2' : 'cloudinary';

    this.logger.log(`Storage provider initialized: ${this.provider}`);

    // Warn if R2 is selected but not configured
    if (this.provider === 'r2' && !this.r2Service.isConfigured()) {
      this.logger.warn(
        'R2 selected but not configured. Falling back to Cloudinary.',
      );
      this.provider = 'cloudinary';
    }
  }

  /**
   * Upload a file to the configured storage provider
   */
  async uploadFile(
    file: Express.Multer.File,
  ): Promise<{ url: string; publicId: string }> {
    this.logger.debug(
      `Uploading file via ${this.provider}: ${file.originalname}`,
    );

    if (this.provider === 'r2') {
      return this.r2Service.uploadFile(file);
    }

    return this.cloudinaryService.uploadFile(file);
  }

  /**
   * Delete a file from the configured storage provider
   */
  async deleteFile(publicId: string): Promise<void> {
    this.logger.debug(`Deleting file via ${this.provider}: ${publicId}`);

    // Detect which provider the file is on based on URL/publicId pattern
    // R2 keys start with 'scholar-app/' and don't have cloudinary in the path
    const isR2File =
      publicId.startsWith('scholar-app/') && !publicId.includes('cloudinary');
    const isCloudinaryFile =
      publicId.includes('cloudinary') || !publicId.startsWith('scholar-app/');

    // Try to delete from the appropriate provider based on file pattern
    if (isR2File || this.provider === 'r2') {
      await this.r2Service.deleteFile(publicId);
    }

    if (isCloudinaryFile || this.provider === 'cloudinary') {
      await this.cloudinaryService.deleteFile(publicId);
    }
  }

  /**
   * Get the current storage provider
   */
  getProvider(): StorageProvider {
    return this.provider;
  }

  /**
   * Check if a specific provider is available
   */
  isProviderAvailable(provider: StorageProvider): boolean {
    if (provider === 'r2') {
      return this.r2Service.isConfigured();
    }

    return true; // Cloudinary is always available if env vars are set
  }
}

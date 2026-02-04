import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  DeleteObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * R2Service - Cloudflare R2 Storage Service
 *
 * Provides S3-compatible storage using Cloudflare R2.
 * Implements the same interface as CloudinaryService for easy swapping.
 */
@Injectable()
export class R2Service {
  private readonly logger = new Logger(R2Service.name);
  private readonly client: S3Client;
  private readonly bucketName: string;
  private readonly publicUrl: string;

  constructor(private readonly configService: ConfigService) {
    const accountId = this.configService.get<string>('R2_ACCOUNT_ID');
    const accessKeyId = this.configService.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>(
      'R2_SECRET_ACCESS_KEY',
    );

    this.bucketName =
      this.configService.get<string>('R2_BUCKET_NAME') || 'peertolearn';
    this.publicUrl = this.configService.get<string>('R2_PUBLIC_URL') || '';

    if (!accountId || !accessKeyId || !secretAccessKey) {
      this.logger.warn(
        'R2 credentials not configured. R2 storage will not be available.',
      );
      // Create a dummy client - will fail gracefully if used
      this.client = new S3Client({
        region: 'auto',
        endpoint: 'https://dummy.r2.cloudflarestorage.com',
      });

      return;
    }

    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    this.logger.log('R2 storage client initialized');
  }

  /**
   * Generate a presigned URL for direct frontend upload to R2
   * Returns the presigned URL, the final public URL, and the object key
   */
  async getPresignedUploadUrl(
    fileType: string,
    originalFilename?: string,
  ): Promise<{
    uploadUrl: string;
    publicUrl: string;
    key: string;
    expiresIn: number;
  }> {
    const ext = originalFilename
      ? path.extname(originalFilename)
      : this.getExtensionFromMimeType(fileType);
    const fileName = `${uuidv4()}${ext}`;
    const key = `materials/${fileName}`;
    const expiresIn = 3600; // 1 hour

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: fileType,
    });

    const uploadUrl = await getSignedUrl(this.client, command, { expiresIn });

    return {
      uploadUrl,
      publicUrl: `${this.publicUrl}/${key}`,
      key,
      expiresIn,
    };
  }

  /**
   * Get file extension from MIME type
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'application/pdf': '.pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        '.docx',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation':
        '.pptx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        '.xlsx',
      'application/msword': '.doc',
      'application/vnd.ms-powerpoint': '.ppt',
      'application/vnd.ms-excel': '.xls',
      'text/plain': '.txt',
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
    };

    return mimeToExt[mimeType] || '';
  }

  /**
   * Upload a file to R2
   * Returns the public URL and object key (like publicId)
   */
  async uploadFile(
    file: Express.Multer.File,
  ): Promise<{ url: string; publicId: string }> {
    const extName = path.extname(file.originalname);
    const fileName = `${uuidv4()}${extName}`;
    const key = `scholar-app/${fileName}`;

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      });

      await this.client.send(command);

      const url = `${this.publicUrl}/${key}`;

      this.logger.log(`File uploaded to R2: ${key}`);

      return {
        url,
        publicId: key,
      };
    } catch (error) {
      this.logger.error('R2 upload failed', error);
      throw error;
    }
  }

  /**
   * Delete a file from R2 by its key (publicId)
   */
  async deleteFile(publicId: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: publicId,
      });

      await this.client.send(command);
      this.logger.log(`File deleted from R2: ${publicId}`);
    } catch (error) {
      this.logger.error(`R2 delete failed for ${publicId}`, error);
      // Don't throw - allow DB deletion to proceed
    }
  }

  /**
   * Delete all files with a given prefix (batch operation)
   */
  async deleteByPrefix(prefix: string): Promise<void> {
    try {
      // List objects with prefix
      const listCommand = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: prefix,
      });

      const listed = await this.client.send(listCommand);

      if (!listed.Contents || listed.Contents.length === 0) {
        this.logger.log(`No objects found with prefix: ${prefix}`);

        return;
      }

      // Batch delete objects (S3 supports up to 1000 objects per batch)
      const objectsToDelete = listed.Contents.filter((obj) => obj.Key).map(
        (obj) => ({ Key: obj.Key! }),
      );

      if (objectsToDelete.length === 0) return;

      // Import DeleteObjectsCommand dynamically to avoid breaking if not needed
      const { DeleteObjectsCommand } = await import('@aws-sdk/client-s3');

      const deleteCommand = new DeleteObjectsCommand({
        Bucket: this.bucketName,
        Delete: {
          Objects: objectsToDelete,
          Quiet: true, // Don't return success info for each object
        },
      });

      await this.client.send(deleteCommand);

      this.logger.log(
        `Batch deleted ${objectsToDelete.length} objects with prefix: ${prefix}`,
      );
    } catch (error) {
      this.logger.error(`R2 delete by prefix failed for ${prefix}`, error);
    }
  }

  /**
   * Check if R2 is properly configured
   */
  isConfigured(): boolean {
    const accountId = this.configService.get<string>('R2_ACCOUNT_ID');

    return !!accountId;
  }

  /**
   * Get the public URL base
   */
  getPublicUrl(): string {
    return this.publicUrl;
  }

  /**
   * Upload a buffer directly to R2 (for TTS audio caching)
   */
  async uploadBuffer(
    buffer: Buffer,
    options: { folder?: string; format?: string; publicId?: string } = {},
  ): Promise<{ url: string; publicId: string }> {
    const { folder = 'tts-cache', format = 'mp3', publicId } = options;
    const fileName = publicId
      ? `${publicId}.${format}`
      : `${uuidv4()}.${format}`;
    const key = `${folder}/${fileName}`;

    // Map format to content type
    const contentTypes: Record<string, string> = {
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      opus: 'audio/opus',
      flac: 'audio/flac',
    };

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentTypes[format] || 'audio/mpeg',
      });

      await this.client.send(command);

      const url = `${this.publicUrl}/${key}`;

      this.logger.log(`TTS audio uploaded to R2: ${key}`);

      return {
        url,
        publicId: key,
      };
    } catch (error) {
      this.logger.error('R2 buffer upload failed', error);
      throw error;
    }
  }
}

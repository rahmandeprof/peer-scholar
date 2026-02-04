import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { HelpfulLink, LinkType } from './entities/helpful-link.entity';
import { Material } from './entities/material.entity';

import {
  CreateHelpfulLinkDto,
  UpdateHelpfulLinkDto,
} from './dtos/helpful-link.dto';

import { Repository } from 'typeorm';

@Injectable()
export class HelpfulLinksService {
  constructor(
    @InjectRepository(HelpfulLink)
    private helpfulLinkRepository: Repository<HelpfulLink>,
    @InjectRepository(Material)
    private materialRepository: Repository<Material>,
  ) {}

  async create(
    dto: CreateHelpfulLinkDto,
    userId: string,
  ): Promise<HelpfulLink> {
    // Verify material exists
    const material = await this.materialRepository.findOne({
      where: { id: dto.materialId },
    });

    if (!material) {
      throw new NotFoundException('Material not found');
    }

    // Auto-detect link type from URL
    const linkType = dto.linkType || this.detectLinkType(dto.url);

    // Extract thumbnail for YouTube videos
    const thumbnailUrl = this.extractThumbnail(dto.url);

    const helpfulLink = this.helpfulLinkRepository.create({
      ...dto,
      linkType,
      thumbnailUrl,
      addedById: userId,
    });

    return this.helpfulLinkRepository.save(helpfulLink);
  }

  async findByMaterial(materialId: string): Promise<HelpfulLink[]> {
    return this.helpfulLinkRepository.find({
      where: { materialId },
      relations: ['addedBy'],
      order: { helpfulCount: 'DESC', createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<HelpfulLink> {
    const link = await this.helpfulLinkRepository.findOne({
      where: { id },
      relations: ['addedBy', 'material'],
    });

    if (!link) {
      throw new NotFoundException('Helpful link not found');
    }

    return link;
  }

  async update(
    id: string,
    dto: UpdateHelpfulLinkDto,
    userId: string,
  ): Promise<HelpfulLink> {
    const link = await this.findOne(id);

    if (link.addedById !== userId) {
      throw new ForbiddenException('You can only edit your own links');
    }

    Object.assign(link, dto);

    return this.helpfulLinkRepository.save(link);
  }

  async remove(id: string, userId: string): Promise<void> {
    const link = await this.findOne(id);

    // Allow deletion by owner or material uploader
    if (link.addedById !== userId && link.material?.uploader?.id !== userId) {
      throw new ForbiddenException('You cannot delete this link');
    }

    await this.helpfulLinkRepository.remove(link);
  }

  async markHelpful(id: string): Promise<HelpfulLink> {
    const link = await this.findOne(id);

    link.helpfulCount += 1;

    return this.helpfulLinkRepository.save(link);
  }

  private detectLinkType(url: string): LinkType {
    const lowerUrl = url.toLowerCase();

    if (
      lowerUrl.includes('youtube.com') ||
      lowerUrl.includes('youtu.be') ||
      lowerUrl.includes('vimeo.com')
    ) {
      return LinkType.VIDEO;
    }

    if (
      lowerUrl.includes('medium.com') ||
      lowerUrl.includes('dev.to') ||
      lowerUrl.includes('wikipedia.org')
    ) {
      return LinkType.ARTICLE;
    }

    if (
      lowerUrl.includes('coursera.org') ||
      lowerUrl.includes('udemy.com') ||
      lowerUrl.includes('khanacademy.org')
    ) {
      return LinkType.TUTORIAL;
    }

    return LinkType.OTHER;
  }

  private extractThumbnail(url: string): string | undefined {
    // YouTube thumbnail extraction
    const youtubeMatch =
      /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/.exec(
        url,
      );

    if (youtubeMatch) {
      return `https://img.youtube.com/vi/${youtubeMatch[1]}/mqdefault.jpg`;
    }

    return undefined;
  }
}

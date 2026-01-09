import { Controller, Get, Post, Param, Body, UseGuards, Logger, NotFoundException, ParseUUIDPipe, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InjectQueue } from '@nestjs/bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not } from 'typeorm';
import { Queue } from 'bull';
import OpenAI from 'openai';
import { ConfigService } from '@nestjs/config';

import { UsersService } from '@/app/users/users.service';
import { Material, MaterialStatus, ProcessingStatus } from '@/app/academic/entities/material.entity';
import { DocumentSegment } from '@/app/academic/entities/document-segment.entity';
import { MaterialReport } from '@/app/academic/entities/material-report.entity';
import { User } from '@/app/users/entities/user.entity';
import { QuizResult } from '@/app/chat/entities/quiz-result.entity';

import { Role } from '@/app/auth/decorators';
import { RolesGuard } from '@/app/auth/guards/roles.guard';

import { Paginate, PaginateQuery } from 'nestjs-paginate';

@Controller('admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Role('admin')
export class AdminController {
  private readonly logger = new Logger(AdminController.name);
  private openai?: OpenAI;

  // Shared filter for materials that are actively processing (not stuck, just in progress)
  private readonly ACTIVELY_PROCESSING_WHERE = [
    { processingStatus: ProcessingStatus.PENDING },
    { processingStatus: ProcessingStatus.EXTRACTING },
    { processingStatus: ProcessingStatus.OCR_EXTRACTING },
    { processingStatus: ProcessingStatus.CLEANING },
    { processingStatus: ProcessingStatus.SEGMENTING },
  ];

  constructor(
    private readonly usersService: UsersService,
    @InjectRepository(Material)
    private readonly materialRepo: Repository<Material>,
    @InjectRepository(DocumentSegment)
    private readonly segmentRepo: Repository<DocumentSegment>,
    @InjectRepository(MaterialReport)
    private readonly reportRepo: Repository<MaterialReport>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(QuizResult)
    private readonly quizResultRepo: Repository<QuizResult>,
    @InjectQueue('materials')
    private readonly materialsQueue: Queue,
    private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    }
  }

  // ========== EXISTING ENDPOINTS ==========

  @Get('users')
  findAll(@Paginate() query: PaginateQuery) {
    return this.usersService.findAll(query);
  }

  /**
   * Reprocess all stuck materials (pending status only)
   */
  @Post('reprocess-stuck')
  async reprocessStuckMaterials() {
    this.logger.log('Admin requested reprocessing of stuck materials (pending only)');

    const stuckMaterials = await this.materialRepo.find({
      where: [
        { status: MaterialStatus.PENDING },
        { processingStatus: ProcessingStatus.PENDING },
      ],
      select: ['id', 'title', 'fileUrl', 'status', 'processingStatus', 'createdAt'],
      order: { createdAt: 'DESC' },
    });

    if (stuckMaterials.length === 0) {
      return { success: true, message: 'No stuck materials found', count: 0, materials: [] };
    }

    const queued: string[] = [];
    const failed: string[] = [];

    for (const material of stuckMaterials) {
      try {
        await this.materialsQueue.add('process-material', {
          materialId: material.id,
          fileUrl: material.fileUrl,
        });
        queued.push(material.id);
        this.logger.log(`Queued stuck material: ${material.id} (${material.title})`);
      } catch (error) {
        failed.push(material.id);
        this.logger.error(`Failed to queue material ${material.id}:`, error);
      }
    }

    return {
      success: true,
      message: `Queued ${queued.length} materials for reprocessing`,
      count: queued.length,
      failed: failed.length,
      materials: stuckMaterials.map(m => ({
        id: m.id,
        title: m.title,
        status: m.status,
        processingStatus: m.processingStatus,
        createdAt: m.createdAt,
      })),
    };
  }

  /**
   * Reprocess stale materials - materials stuck in active processing states for too long
   * Default: materials stuck for more than 30 minutes in EXTRACTING, OCR_EXTRACTING, CLEANING, or SEGMENTING
   */
  @Post('reprocess-stale')
  async reprocessStaleMaterials(@Body('staleMinutes') staleMinutes: number = 30) {
    this.logger.log(`Admin requested reprocessing of stale materials (>${staleMinutes} minutes)`);

    const staleThreshold = new Date();
    staleThreshold.setMinutes(staleThreshold.getMinutes() - staleMinutes);

    // Find materials stuck in active processing states for too long
    const staleMaterials = await this.materialRepo
      .createQueryBuilder('material')
      .where('material.processingStatus IN (:...statuses)', {
        statuses: [
          ProcessingStatus.EXTRACTING,
          ProcessingStatus.OCR_EXTRACTING,
          ProcessingStatus.CLEANING,
          ProcessingStatus.SEGMENTING,
        ],
      })
      .andWhere('material.updatedAt < :threshold', { threshold: staleThreshold })
      .select(['material.id', 'material.title', 'material.fileUrl', 'material.status', 'material.processingStatus', 'material.createdAt', 'material.updatedAt'])
      .orderBy('material.updatedAt', 'ASC')
      .getMany();

    if (staleMaterials.length === 0) {
      return { success: true, message: 'No stale materials found', count: 0, materials: [] };
    }

    const queued: string[] = [];
    const errors: string[] = [];

    for (const material of staleMaterials) {
      try {
        // Reset to PENDING before reprocessing
        await this.materialRepo.update(material.id, {
          processingStatus: ProcessingStatus.PENDING,
          status: MaterialStatus.PENDING,
        });

        await this.materialsQueue.add('process-material', {
          materialId: material.id,
          fileUrl: material.fileUrl,
        });
        queued.push(material.id);
        this.logger.log(`Requeued stale material: ${material.id} (${material.title}) - was ${material.processingStatus}`);
      } catch (error) {
        errors.push(material.id);
        this.logger.error(`Failed to requeue stale material ${material.id}:`, error);
      }
    }

    return {
      success: true,
      message: `Requeued ${queued.length} stale materials for reprocessing`,
      count: queued.length,
      failed: errors.length,
      staleThresholdMinutes: staleMinutes,
      materials: staleMaterials.map(m => ({
        id: m.id,
        title: m.title,
        status: m.status,
        processingStatus: m.processingStatus,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      })),
    };
  }

  /**
   * Force reprocess a single material - resets it to PENDING regardless of current state
   */
  @Post('materials/:id/force-reprocess')
  async forceReprocessMaterial(@Param('id', new ParseUUIDPipe()) id: string) {
    this.logger.log(`Admin requested force reprocess for material: ${id}`);

    const material = await this.materialRepo.findOne({
      where: { id },
      select: ['id', 'title', 'fileUrl', 'status', 'processingStatus'],
    });

    if (!material) {
      throw new NotFoundException('Material not found');
    }

    const previousStatus = material.processingStatus;

    // Reset to PENDING
    await this.materialRepo.update(id, {
      processingStatus: ProcessingStatus.PENDING,
      status: MaterialStatus.PENDING,
    });

    // Queue for reprocessing
    await this.materialsQueue.add('process-material', {
      materialId: material.id,
      fileUrl: material.fileUrl,
    });

    this.logger.log(`Force requeued material: ${id} (${material.title}) - was ${previousStatus}`);

    return {
      success: true,
      message: `Material ${id} queued for reprocessing`,
      material: {
        id: material.id,
        title: material.title,
        previousStatus,
        newStatus: ProcessingStatus.PENDING,
      },
    };
  }

  @Get('stuck-materials/count')
  async getStuckMaterialsCount() {
    // Count materials in PENDING status
    const pendingCount = await this.materialRepo.count({
      where: [
        { status: MaterialStatus.PENDING },
        { processingStatus: ProcessingStatus.PENDING },
      ],
    });

    // Count materials in active processing states (potentially stale)
    const activeCount = await this.materialRepo.count({
      where: [
        { processingStatus: ProcessingStatus.EXTRACTING },
        { processingStatus: ProcessingStatus.OCR_EXTRACTING },
        { processingStatus: ProcessingStatus.CLEANING },
        { processingStatus: ProcessingStatus.SEGMENTING },
      ],
    });

    // Count stale materials (active states for > 30 minutes)
    const staleThreshold = new Date();
    staleThreshold.setMinutes(staleThreshold.getMinutes() - 30);

    const staleCount = await this.materialRepo
      .createQueryBuilder('material')
      .where('material.processingStatus IN (:...statuses)', {
        statuses: [
          ProcessingStatus.EXTRACTING,
          ProcessingStatus.OCR_EXTRACTING,
          ProcessingStatus.CLEANING,
          ProcessingStatus.SEGMENTING,
        ],
      })
      .andWhere('material.updatedAt < :threshold', { threshold: staleThreshold })
      .getCount();

    return {
      pending: pendingCount,
      activeProcessing: activeCount,
      stale: staleCount,
      total: pendingCount + staleCount, // Total "stuck" = pending + stale
    };
  }

  // ========== BATCHED ENDPOINT FOR DASHBOARD ==========

  /**
   * Get all admin dashboard overview data in one call
   * Combines stats, queue status, stuck count, and quiz stats for faster load
   */
  @Get('overview')
  async getOverview() {
    this.logger.log('Admin requested overview (batched)');

    // Fetch all data in parallel
    const [
      // Stats
      totalUsers,
      totalMaterials,
      materialsReady,
      materialsProcessing,
      materialsFailed,
      totalQuizzesTaken,
      materialsMissingSummary,
      // Stuck count
      stuckCount,
      // Queue status (wrapped in try-catch)
      queueStatusResult,
    ] = await Promise.all([
      // Stats queries
      this.userRepo.count(),
      this.materialRepo.count(),
      this.materialRepo.count({ where: { status: MaterialStatus.READY } }),
      this.materialRepo.count({
        where: this.ACTIVELY_PROCESSING_WHERE,
      }),
      this.materialRepo.count({ where: { processingStatus: ProcessingStatus.FAILED } }),
      this.quizResultRepo.count(),
      this.materialRepo.count({
        where: { summary: IsNull(), processingStatus: ProcessingStatus.COMPLETED },
      }),
      // Stuck count
      this.materialRepo.count({
        where: this.ACTIVELY_PROCESSING_WHERE,
      }),
      // Queue status wrapped to prevent rejection from failing entire batch
      Promise.all([
        this.materialsQueue.getWaitingCount(),
        this.materialsQueue.getActiveCount(),
        this.materialsQueue.getCompletedCount(),
        this.materialsQueue.getFailedCount(),
        this.materialsQueue.getDelayedCount(),
      ]).catch(() => null),
    ]);

    // Build queue status response
    let queueStatus = null;
    if (queueStatusResult) {
      const [waiting, active, completed, failed, delayed] = queueStatusResult;
      queueStatus = {
        queue: 'materials',
        counts: { waiting, active, completed, failed, delayed },
        total: waiting + active + completed + failed + delayed,
      };
    }

    return {
      stats: {
        users: { total: totalUsers },
        materials: {
          total: totalMaterials,
          ready: materialsReady,
          processing: materialsProcessing,
          failed: materialsFailed,
          missingSummary: materialsMissingSummary,
        },
        quizzes: { taken: totalQuizzesTaken },
      },
      stuckCount,
      queueStatus,
    };
  }

  // ========== HIGH-PRIORITY ENDPOINTS ==========

  /**
   * Get dashboard stats
   */
  @Get('stats')
  async getStats() {
    this.logger.log('Admin requested stats');

    const [
      totalUsers,
      totalMaterials,
      materialsReady,
      materialsProcessing,
      materialsFailed,
      totalQuizzesTaken,
      materialsMissingSummary,
    ] = await Promise.all([
      this.userRepo.count(),
      this.materialRepo.count(),
      this.materialRepo.count({ where: { status: MaterialStatus.READY } }),
      this.materialRepo.count({
        where: this.ACTIVELY_PROCESSING_WHERE,
      }),
      this.materialRepo.count({ where: { processingStatus: ProcessingStatus.FAILED } }),
      this.quizResultRepo.count(),
      this.materialRepo.count({
        where: { summary: IsNull(), processingStatus: ProcessingStatus.COMPLETED },
      }),
    ]);

    return {
      users: { total: totalUsers },
      materials: {
        total: totalMaterials,
        ready: materialsReady,
        processing: materialsProcessing,
        failed: materialsFailed,
        missingSummary: materialsMissingSummary,
      },
      quizzes: { taken: totalQuizzesTaken },
    };
  }

  /**
   * Backfill summaries for materials that don't have them
   */
  @Post('backfill-summaries')
  async backfillSummaries(@Body('limit') limit: number = 10) {
    this.logger.log(`Admin requested summary backfill (limit: ${limit})`);

    if (!this.openai) {
      return { success: false, message: 'OpenAI not configured', processed: 0 };
    }

    const materials = await this.materialRepo.find({
      where: { summary: IsNull(), processingStatus: ProcessingStatus.COMPLETED },
      take: Math.min(limit, 50),
      order: { createdAt: 'DESC' },
    });

    if (materials.length === 0) {
      return { success: true, message: 'No materials need summaries', processed: 0 };
    }

    const results: { id: string; title: string; success: boolean; error?: string }[] = [];

    for (const material of materials) {
      try {
        const segments = await this.segmentRepo.find({
          where: { materialId: material.id },
          order: { segmentIndex: 'ASC' },
          take: 15,
        });

        if (segments.length === 0) {
          results.push({ id: material.id, title: material.title, success: false, error: 'No segments' });
          continue;
        }

        let content = '';
        let tokenCount = 0;
        for (const segment of segments) {
          if (tokenCount + segment.tokenCount > 6000) break;
          content += segment.text + '\n\n';
          tokenCount += segment.tokenCount;
        }

        if (!content.trim()) {
          results.push({ id: material.id, title: material.title, success: false, error: 'Empty content' });
          continue;
        }

        const response = await this.openai.chat.completions.create({
          model: this.configService.get<string>('OPENAI_CHAT_MODEL') ?? 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'Summarize the following text concisely but comprehensively for a student.' },
            { role: 'user', content },
          ],
          max_tokens: 500,
        });

        const summary = response.choices[0].message.content ?? '';

        if (summary) {
          material.summary = summary;
          await this.materialRepo.save(material);
          results.push({ id: material.id, title: material.title, success: true });
          this.logger.log(`Generated summary for material: ${material.id}`);
        } else {
          results.push({ id: material.id, title: material.title, success: false, error: 'Empty response' });
        }
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : 'Unknown error';
        results.push({ id: material.id, title: material.title, success: false, error: errMsg });
        this.logger.error(`Failed to generate summary for ${material.id}:`, error);
      }
    }

    const successCount = results.filter(r => r.success).length;
    return {
      success: true,
      message: `Generated ${successCount} of ${materials.length} summaries`,
      processed: successCount,
      total: materials.length,
      results,
    };
  }

  /**
   * Toggle user ban status
   */
  @Post('users/:id/ban')
  async toggleUserBan(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body('reason') reason?: string,
  ) {
    this.logger.log(`Admin toggling ban for user: ${id}`);

    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.banned = !user.banned;
    user.banReason = user.banned ? (reason || 'Banned by admin') : null;
    user.banExpires = null;

    await this.userRepo.save(user);

    this.logger.log(`User ${id} ${user.banned ? 'banned' : 'unbanned'}`);

    return {
      success: true,
      message: user.banned ? 'User banned successfully' : 'User unbanned successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        banned: user.banned,
        banReason: user.banReason,
      },
    };
  }

  /**
   * Get Bull queue status
   */
  @Get('queue-status')
  async getQueueStatus() {
    this.logger.log('Admin requested queue status');

    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        this.materialsQueue.getWaitingCount(),
        this.materialsQueue.getActiveCount(),
        this.materialsQueue.getCompletedCount(),
        this.materialsQueue.getFailedCount(),
        this.materialsQueue.getDelayedCount(),
      ]);

      return {
        success: true,
        queue: 'materials',
        counts: { waiting, active, completed, failed, delayed },
        total: waiting + active + completed + failed + delayed,
      };
    } catch (error) {
      this.logger.error('Failed to get queue status:', error);
      return {
        success: false,
        message: 'Failed to get queue status. Redis may not be connected.',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Clear completed jobs from the queue
   */
  @Post('queue/clear-completed')
  async clearCompletedJobs() {
    this.logger.log('Admin requested clearing completed jobs');
    try {
      await this.materialsQueue.clean(0, 'completed');
      return { success: true, message: 'Completed jobs cleared' };
    } catch (error) {
      this.logger.error('Failed to clear completed jobs:', error);
      return {
        success: false,
        message: 'Failed to clear completed jobs',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Clear failed jobs from the queue
   */
  @Post('queue/clear-failed')
  async clearFailedJobs() {
    this.logger.log('Admin requested clearing failed jobs');
    try {
      await this.materialsQueue.clean(0, 'failed');
      return { success: true, message: 'Failed jobs cleared' };
    } catch (error) {
      this.logger.error('Failed to clear failed jobs:', error);
      return {
        success: false,
        message: 'Failed to clear failed jobs',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Retry all failed jobs in the queue
   */
  @Post('queue/retry-failed')
  async retryFailedJobs() {
    this.logger.log('Admin requested retrying failed jobs');
    try {
      const failed = await this.materialsQueue.getFailed();
      let retried = 0;
      for (const job of failed) {
        await job.retry();
        retried++;
      }
      return { success: true, message: `Retried ${retried} failed jobs`, count: retried };
    } catch (error) {
      this.logger.error('Failed to retry failed jobs:', error);
      return {
        success: false,
        message: 'Failed to retry failed jobs',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Reprocess failed materials only
   */
  @Post('reprocess-failed')
  async reprocessFailedMaterials() {
    this.logger.log('Admin requested reprocessing of failed materials');

    const failedMaterials = await this.materialRepo.find({
      where: { processingStatus: ProcessingStatus.FAILED },
      select: ['id', 'title', 'fileUrl', 'status', 'processingStatus', 'createdAt'],
      order: { createdAt: 'DESC' },
    });

    if (failedMaterials.length === 0) {
      return { success: true, message: 'No failed materials found', count: 0, materials: [] };
    }

    const queued: string[] = [];
    const errors: string[] = [];

    for (const material of failedMaterials) {
      try {
        await this.materialRepo.update(material.id, {
          processingStatus: ProcessingStatus.PENDING,
          status: MaterialStatus.PENDING,
        });

        await this.materialsQueue.add('process-material', {
          materialId: material.id,
          fileUrl: material.fileUrl,
        });
        queued.push(material.id);
        this.logger.log(`Requeued failed material: ${material.id} (${material.title})`);
      } catch (error) {
        errors.push(material.id);
        this.logger.error(`Failed to requeue material ${material.id}:`, error);
      }
    }

    return {
      success: true,
      message: `Queued ${queued.length} failed materials for reprocessing`,
      count: queued.length,
      failed: errors.length,
      materials: failedMaterials.map(m => ({
        id: m.id,
        title: m.title,
        status: m.status,
        processingStatus: m.processingStatus,
        createdAt: m.createdAt,
      })),
    };
  }

  // ========== MEDIUM-PRIORITY ENDPOINTS ==========

  /**
   * Get segments for a material (debug view)
   */
  @Get('materials/:id/segments')
  async getMaterialSegments(@Param('id', new ParseUUIDPipe()) id: string) {
    this.logger.log(`Admin requested segments for material: ${id}`);

    const material = await this.materialRepo.findOne({
      where: { id },
      select: ['id', 'title', 'processingStatus', 'materialVersion'],
    });

    if (!material) {
      throw new NotFoundException('Material not found');
    }

    const segments = await this.segmentRepo.find({
      where: { materialId: id },
      order: { segmentIndex: 'ASC' },
    });

    return {
      material: {
        id: material.id,
        title: material.title,
        processingStatus: material.processingStatus,
        materialVersion: material.materialVersion,
      },
      segmentCount: segments.length,
      totalTokens: segments.reduce((sum, s) => sum + s.tokenCount, 0),
      segments: segments.map(s => ({
        id: s.id,
        index: s.segmentIndex,
        pageStart: s.pageStart,
        pageEnd: s.pageEnd,
        tokenCount: s.tokenCount,
        source: s.source,
        textPreview: s.text.substring(0, 200) + (s.text.length > 200 ? '...' : ''),
      })),
    };
  }

  /**
   * Clear cached data for a material (quiz, summary, key points)
   */
  @Post('materials/:id/clear-cache')
  async clearMaterialCache(@Param('id', new ParseUUIDPipe()) id: string) {
    this.logger.log(`Admin clearing cache for material: ${id}`);

    const material = await this.materialRepo.findOne({ where: { id } });

    if (!material) {
      throw new NotFoundException('Material not found');
    }

    const hadSummary = !!material.summary;
    const hadQuiz = material.quiz && material.quiz.length > 0;
    const hadKeyPoints = material.keyPoints && material.keyPoints.length > 0;
    const hadFlashcards = material.flashcards && material.flashcards.length > 0;

    material.summary = null as any;
    material.quiz = null as any;
    material.keyPoints = null as any;
    material.flashcards = null as any;
    material.quizGeneratedVersion = null as any;

    await this.materialRepo.save(material);

    this.logger.log(`Cache cleared for material ${id}`);

    return {
      success: true,
      message: 'Cache cleared successfully',
      cleared: {
        summary: hadSummary,
        quiz: hadQuiz,
        keyPoints: hadKeyPoints,
        flashcards: hadFlashcards,
      },
    };
  }

  /**
   * Get all material reports
   */
  @Get('reports')
  async getReports() {
    this.logger.log('Admin requested all reports');

    const reports = await this.reportRepo.find({
      relations: ['material', 'reporter'],
      order: { createdAt: 'DESC' },
      take: 100,
    });

    return {
      count: reports.length,
      reports: reports.map(r => ({
        id: r.id,
        reason: r.reason,
        description: r.description,
        createdAt: r.createdAt,
        material: r.material ? {
          id: r.material.id,
          title: r.material.title,
        } : null,
        reporter: r.reporter ? {
          id: r.reporter.id,
          firstName: r.reporter.firstName,
          lastName: r.reporter.lastName,
          email: r.reporter.email,
        } : null,
      })),
    };
  }

  /**
   * Get quiz statistics for admin dashboard
   */
  @Get('quiz-stats')
  async getQuizStats() {
    this.logger.log('Admin requested quiz statistics');

    try {
      // Total quiz count
      const totalQuizzes = await this.quizResultRepo.count();

      // Recent quizzes (last 20)
      const recentQuizzes = await this.quizResultRepo.find({
        relations: ['user', 'material'],
        order: { createdAt: 'DESC' },
        take: 20,
      });

      // Calculate average score
      const avgScoreResult = await this.quizResultRepo
        .createQueryBuilder('quiz')
        .select('AVG(CAST(quiz.score AS FLOAT) / CAST(quiz.totalQuestions AS FLOAT))', 'avgScore')
        .getRawOne();

      const averageScore = avgScoreResult?.avgScore
        ? parseFloat(avgScoreResult.avgScore)
        : 0;

      return {
        total: totalQuizzes,
        averageScore: Math.round(averageScore * 100) / 100, // Round to 2 decimal places
        recentQuizzes: recentQuizzes.map(q => ({
          id: q.id,
          userName: `${q.user.firstName} ${q.user.lastName}`,
          userEmail: q.user.email,
          materialTitle: q.material.title,
          materialId: q.material.id,
          score: q.score,
          totalQuestions: q.totalQuestions,
          percentage: Math.round((q.score / q.totalQuestions) * 100),
          createdAt: q.createdAt,
        })),
      };
    } catch (error) {
      this.logger.error('Failed to fetch quiz stats:', error);
      throw new BadRequestException('Failed to fetch quiz statistics');
    }
  }

  /**
   * Change user role
   */
  @Post('users/:id/role')
  async changeUserRole(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body('role') role: string,
  ) {
    this.logger.log(`Admin changing role for user ${id} to ${role}`);

    if (!role || !['user', 'admin'].includes(role)) {
      throw new BadRequestException('Invalid role. Must be "user" or "admin"');
    }

    const user = await this.userRepo.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const previousRole = user.role;
    user.role = role;

    await this.userRepo.save(user);

    this.logger.log(`User ${id} role changed from ${previousRole} to ${role}`);

    return {
      success: true,
      message: `User role changed to ${role}`,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        previousRole,
      },
    };
  }

  // ========== NICE-TO-HAVE ENDPOINTS ==========

  /**
   * Get usage analytics
   */
  @Get('analytics')
  async getAnalytics() {
    this.logger.log('Admin requested analytics');

    // Get registrations by day for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      recentUsers,
      recentMaterials,
      recentQuizzes,
      topUploaders,
      materialsByStatus,
    ] = await Promise.all([
      // Users in last 30 days
      this.userRepo.createQueryBuilder('user')
        .where('user.createdAt >= :date', { date: thirtyDaysAgo })
        .getCount(),
      // Materials in last 30 days
      this.materialRepo.createQueryBuilder('material')
        .where('material.createdAt >= :date', { date: thirtyDaysAgo })
        .getCount(),
      // Quizzes in last 30 days
      this.quizResultRepo.createQueryBuilder('quiz')
        .where('quiz.createdAt >= :date', { date: thirtyDaysAgo })
        .getCount(),
      // Top uploaders (top 5)
      this.materialRepo.createQueryBuilder('material')
        .select('material.uploader_id', 'uploaderId')
        .addSelect('COUNT(*)', 'count')
        .leftJoin('material.uploader', 'user')
        .addSelect('user.firstName', 'firstName')
        .addSelect('user.lastName', 'lastName')
        .groupBy('material.uploader_id')
        .addGroupBy('user.firstName')
        .addGroupBy('user.lastName')
        .orderBy('count', 'DESC')
        .limit(5)
        .getRawMany(),
      // Materials by status
      this.materialRepo.createQueryBuilder('material')
        .select('material.processingStatus', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('material.processingStatus')
        .getRawMany(),
    ]);

    return {
      last30Days: {
        users: recentUsers,
        materials: recentMaterials,
        quizzes: recentQuizzes,
      },
      topUploaders: topUploaders.map((u: any) => ({
        firstName: u.firstName,
        lastName: u.lastName,
        count: parseInt(u.count, 10),
      })),
      materialsByStatus: materialsByStatus.reduce((acc: any, item: any) => {
        acc[item.status || 'null'] = parseInt(item.count, 10);
        return acc;
      }, {}),
    };
  }

  /**
   * Get recent admin activity logs (from database where available)
   */
  @Get('logs')
  async getLogs() {
    this.logger.log('Admin requested logs');

    // Get recent materials processed/failed
    const recentActivity = await this.materialRepo.find({
      select: ['id', 'title', 'status', 'processingStatus', 'createdAt', 'updatedAt'],
      order: { updatedAt: 'DESC' },
      take: 50,
    });

    // Get recent quiz results
    const recentQuizzes = await this.quizResultRepo.find({
      relations: ['user', 'material'],
      order: { createdAt: 'DESC' },
      take: 20,
    });

    return {
      recentMaterialActivity: recentActivity.map(m => ({
        id: m.id,
        title: m.title,
        status: m.status,
        processingStatus: m.processingStatus,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      })),
      recentQuizzes: recentQuizzes.map(q => ({
        id: q.id,
        userId: q.user?.id,
        userName: q.user ? `${q.user.firstName} ${q.user.lastName}` : 'Unknown',
        materialTitle: q.material?.title || 'Unknown',
        score: q.score,
        totalQuestions: q.totalQuestions,
        createdAt: q.createdAt,
      })),
    };
  }

  /**
   * Bulk delete materials
   */
  @Post('bulk-delete')
  async bulkDeleteMaterials(@Body('ids') ids: string[]) {
    this.logger.log(`Admin requested bulk delete of ${ids?.length || 0} materials`);

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException('No material IDs provided');
    }

    if (ids.length > 50) {
      throw new BadRequestException('Cannot delete more than 50 materials at once');
    }

    const deleted: string[] = [];
    const errors: { id: string; error: string }[] = [];

    for (const id of ids) {
      try {
        const material = await this.materialRepo.findOne({ where: { id } });
        if (!material) {
          errors.push({ id, error: 'Not found' });
          continue;
        }
        await this.materialRepo.remove(material);
        deleted.push(id);
        this.logger.log(`Deleted material: ${id}`);
      } catch (error) {
        errors.push({ id, error: error instanceof Error ? error.message : 'Unknown error' });
        this.logger.error(`Failed to delete material ${id}:`, error);
      }
    }

    return {
      success: true,
      message: `Deleted ${deleted.length} of ${ids.length} materials`,
      deleted,
      errors,
    };
  }
}

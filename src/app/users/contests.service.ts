import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Contest } from './entities/contest.entity';
import { Referral, ReferralStatus } from './entities/referral.entity';

import { CacheService } from '@/app/cache/cache.service';
import { WinstonLoggerService } from '@/logger/winston-logger/winston-logger.service';

import { Repository } from 'typeorm';

@Injectable()
export class ContestsService {
  constructor(
    @InjectRepository(Contest)
    private readonly contestRepo: Repository<Contest>,
    @InjectRepository(Referral)
    private readonly referralRepo: Repository<Referral>,
    private readonly cacheService: CacheService,
    private readonly logger: WinstonLoggerService,
  ) {
    this.logger.setContext(ContestsService.name);
  }

  async createContest(data: {
    name: string;
    description?: string;
    startDate: Date;
    endDate: Date;
    isActive?: boolean;
    prizeConfig?: Record<string, string>;
    rules?: string;
  }) {
    // Deactivate any currently active contest if the new one is active
    if (data.isActive) {
      await this.contestRepo.update({ isActive: true }, { isActive: false });
      this.cacheService.delete('active_contest');
    }

    const contest = this.contestRepo.create({
      name: data.name,
      description: data.description,
      startDate: data.startDate,
      endDate: data.endDate,
      isActive: data.isActive ?? false,
      prizeConfig: data.prizeConfig,
      rules: data.rules,
    });

    const saved = await this.contestRepo.save(contest);

    this.logger.log(`Contest created: ${saved.name} (${saved.id})`);

    return saved;
  }

  async getAllContests() {
    return this.contestRepo.find({
      order: {
        startDate: 'DESC',
      },
      withDeleted: false,
    });
  }

  async updateContest(
    id: string,
    data: {
      name?: string;
      description?: string;
      startDate?: Date;
      endDate?: Date;
      isActive?: boolean;
      prizeConfig?: Record<string, string>;
      rules?: string;
    },
  ) {
    const contest = await this.contestRepo.findOne({ where: { id } });

    if (!contest) throw new NotFoundException('Contest not found');

    // If changing active status
    if (data.isActive !== undefined && data.isActive !== contest.isActive) {
      if (data.isActive) {
        await this.contestRepo.update({ isActive: true }, { isActive: false });
      }
      this.cacheService.delete('active_contest');
      this.cacheService.delete('active_contest_leaderboard');
    } else if (
      data.startDate !== undefined ||
      data.endDate !== undefined ||
      data.prizeConfig !== undefined ||
      data.rules !== undefined
    ) {
      // Clear cache if important fields changed
      this.cacheService.delete('active_contest');
      this.cacheService.delete('active_contest_leaderboard');
    }

    Object.assign(contest, data);
    const saved = await this.contestRepo.save(contest);

    this.logger.log(`Contest updated: ${saved.name} (${saved.id})`);

    return saved;
  }

  async deleteContest(id: string) {
    const contest = await this.contestRepo.findOne({ where: { id } });

    if (!contest) throw new NotFoundException('Contest not found');

    if (contest.isActive) {
      this.cacheService.delete('active_contest');
      this.cacheService.delete('active_contest_leaderboard');
    }

    await this.contestRepo.softRemove(contest);
    this.logger.log(`Contest deleted: ${contest.name} (${contest.id})`);

    return { success: true };
  }

  async getActiveContest() {
    const now = new Date();

    // Cache for 1 minute since active contest rarely changes
    return this.cacheService.getOrSet(
      'active_contest',
      () =>
        this.contestRepo
          .createQueryBuilder('c')
          .where('c.isActive = true')
          .andWhere('c.endDate >= :now', { now })
          .getOne(),
      60,
    );
  }

  async getLeaderboard() {
    const activeContest = await this.getActiveContest();

    if (!activeContest) {
      return [];
    }

    // Cache leaderboard for 15 seconds to handle high traffic while remaining live
    return this.cacheService.getOrSet(
      'active_contest_leaderboard',
      async () => {
        // Query to get top participants based on QUALIFIED referrals within contest window
        const results = await this.referralRepo
          .createQueryBuilder('r')
          .innerJoin('r.referrer', 'user')
          .select([
            'user.id AS user_id',
            'user.firstName AS first_name',
            'user.lastName AS last_name',
            'user.image AS image',
          ])
          .addSelect('COUNT(r.id)', 'qualified_count')
          .addSelect('MAX(r.qualifiedAt)', 'last_qualified_at') // For tie-breaking
          .where('r.status = :status', { status: ReferralStatus.QUALIFIED })
          .andWhere('r.qualifiedAt >= :startDate', {
            startDate: activeContest.startDate,
          })
          .andWhere('r.qualifiedAt <= :endDate', {
            endDate: activeContest.endDate,
          })
          .andWhere('r.disqualifiedAt IS NULL')
          .groupBy('user.id')
          .orderBy('"qualified_count"', 'DESC') // Sort by count descending
          .addOrderBy('"last_qualified_at"', 'ASC') // Tie-breaker 1: first to reach count wins
          .addOrderBy('user.id', 'ASC') // Tie-breaker 2: stable sort
          .limit(50)
          .getRawMany();

        return results.map((r, index) => ({
          rank: index + 1,
          userId: r.user_id,
          firstName: r.first_name,
          lastName: r.last_name,
          image: r.image,
          qualifiedCount: parseInt(r.qualified_count, 10),
          lastQualifiedAt: r.last_qualified_at,
        }));
      },
      15, // 15s TTL
    );
  }

  async getMyStats(userId: string) {
    const activeContest = await this.getActiveContest();

    if (!activeContest) {
      return {
        isActive: false,
        qualifiedCount: 0,
        rank: null,
      };
    }

    // Get user's own qualified referrals within contest window
    const countResult = await this.referralRepo
      .createQueryBuilder('r')
      .select('COUNT(r.id)', 'count')
      .where('r.referrerId = :userId', { userId })
      .andWhere('r.status = :status', { status: ReferralStatus.QUALIFIED })
      .andWhere('r.qualifiedAt >= :startDate', {
        startDate: activeContest.startDate,
      })
      .andWhere('r.qualifiedAt <= :endDate', { endDate: activeContest.endDate })
      .andWhere('r.disqualifiedAt IS NULL')
      .getRawOne();

    const qualifiedCount = parseInt(countResult.count, 10);

    // Determine user's rank from the cached leaderboard to ensure consistency
    const leaderboard = await this.getLeaderboard();
    const leaderEntry = leaderboard.find((entry) => entry.userId === userId);
    let rank = leaderEntry ? leaderEntry.rank : null;

    // If not in top 50 but has referrals, we calculate absolute rank
    // Note: If scale is huge, rank() window function might be needed, but COUNT > user_count is efficient
    if (!rank && qualifiedCount > 0) {
      // Find how many users have MORE qualified referrals
      const higherRankedSubquery = await this.referralRepo
        .createQueryBuilder('r_inner')
        .select('r_inner.referrerId')
        .addSelect('COUNT(r_inner.id)', 'c_count')
        .addSelect('MAX(r_inner.qualifiedAt)', 'last_q')
        .where('r_inner.status = :status', { status: ReferralStatus.QUALIFIED })
        .andWhere('r_inner.qualifiedAt >= :startDate', {
          startDate: activeContest.startDate,
        })
        .andWhere('r_inner.qualifiedAt <= :endDate', {
          endDate: activeContest.endDate,
        })
        .andWhere('r_inner.disqualifiedAt IS NULL')
        .groupBy('r_inner.referrerId')
        .having(
          'COUNT(r_inner.id) > :myCount OR (COUNT(r_inner.id) = :myCount AND MAX(r_inner.qualifiedAt) < :myDate)',
          {
            myCount: qualifiedCount,
            myDate: leaderEntry?.lastQualifiedAt || new Date(), // fallback
          },
        )
        .getRawMany();

      rank = higherRankedSubquery.length + 1;
    }

    return {
      isActive: true,
      contestId: activeContest.id,
      contestName: activeContest.name,
      endDate: activeContest.endDate,
      prizeConfig: activeContest.prizeConfig,
      qualifiedCount,
      rank,
    };
  }

  async getAdminStats() {
    const activeContest = await this.getActiveContest();

    const stats = await this.referralRepo
      .createQueryBuilder('r')
      .select('COUNT(r.id)', 'total')
      .addSelect(
        `SUM(CASE WHEN r.status = '${ReferralStatus.PENDING}' THEN 1 ELSE 0 END)`,
        'pending',
      )
      .addSelect(
        `SUM(CASE WHEN r.status = '${ReferralStatus.COMPLETED}' THEN 1 ELSE 0 END)`,
        'completed',
      )
      .addSelect(
        `SUM(CASE WHEN r.status = '${ReferralStatus.QUALIFIED}' THEN 1 ELSE 0 END)`,
        'qualified',
      )
      .addSelect(
        `SUM(CASE WHEN r.disqualifiedAt IS NOT NULL THEN 1 ELSE 0 END)`,
        'disqualified',
      )
      .getRawOne();

    return {
      activeContest: activeContest
        ? {
            id: activeContest.id,
            name: activeContest.name,
            startDate: activeContest.startDate,
            endDate: activeContest.endDate,
            isActive: activeContest.isActive,
          }
        : null,
      referrals: {
        total: parseInt(stats.total || '0', 10),
        pending: parseInt(stats.pending || '0', 10),
        completed: parseInt(stats.completed || '0', 10),
        qualified: parseInt(stats.qualified || '0', 10),
        disqualified: parseInt(stats.disqualified || '0', 10),
      },
    };
  }

  async disqualifyReferral(referralId: string, reason: string) {
    const referral = await this.referralRepo.findOne({
      where: { id: referralId },
    });

    if (!referral) throw new NotFoundException('Referral not found');

    referral.status = ReferralStatus.DISQUALIFIED;
    referral.disqualifiedAt = new Date();
    referral.disqualificationReason = reason;
    await this.referralRepo.save(referral);

    // Invalidate caches to update leaderboard instantly
    await this.cacheService.delete('active_contest_leaderboard');
    this.logger.warn(
      `Referral ${referralId} manually disqualified. Reason: ${reason}`,
    );

    return { success: true };
  }

  async getSuspiciousParticipants() {
    // Look for users who have a high number of PENDING or COMPLETED referrals
    // but very few QUALIFIED referrals compared to total
    // This is explicitly matching the heuristic requested to identify bot farmers
    return this.referralRepo.query(`
      SELECT 
        u.id AS user_id, 
        u.first_name, 
        u.last_name, 
        u.email,
        COUNT(r.id) AS total_referrals,
        SUM(CASE WHEN r.status = 'qualified' THEN 1 ELSE 0 END) AS qualified_referrals,
        SUM(CASE WHEN r.status = 'completed' THEN 1 ELSE 0 END) AS completed_referrals
      FROM referral r
      JOIN "user" u ON r.referrer_id = u.id
      WHERE r.disqualified_at IS NULL
      GROUP BY u.id, u.first_name, u.last_name, u.email
      HAVING COUNT(r.id) > 10 
         AND (SUM(CASE WHEN r.status = 'qualified' THEN 1 ELSE 0 END)::float / COUNT(r.id)) < 0.2
      ORDER BY total_referrals DESC
      LIMIT 100
    `);
  }
}

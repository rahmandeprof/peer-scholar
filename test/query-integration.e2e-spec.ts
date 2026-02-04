import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { AppModule } from '../src/app.module';

import { DataSource } from 'typeorm';

/**
 * Integration tests to verify key database queries work correctly.
 * These tests catch column name mismatches before deployment.
 */
describe('Database Query Integration Tests', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    dataSource = moduleFixture.get(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Material Queries', () => {
    it('should query trending materials without column errors', async () => {
      // This query uses uploader.id - must not throw column error
      const query = dataSource
        .getRepository('Material')
        .createQueryBuilder('material')
        .leftJoinAndSelect('material.uploader', 'uploader')
        .where('material.scope = :scope', { scope: 'public' })
        .orWhere('uploader.id = :userId', { userId: 'test-user-id' })
        .orderBy('material.views', 'DESC')
        .take(5);

      // Should not throw - we're just verifying the query builds correctly
      const sql = query.getSql();

      expect(sql).toContain('uploader');
      expect(sql).not.toContain('uploaderid'); // Lowercase would indicate bug
    });

    it('should query materials by scope without column errors', async () => {
      const query = dataSource
        .getRepository('Material')
        .createQueryBuilder('material')
        .leftJoinAndSelect('material.uploader', 'uploader')
        .where('material.scope = :scope', { scope: 'public' })
        .orderBy('material.createdAt', 'DESC');

      const sql = query.getSql();

      expect(sql).toContain('created_at'); // Should be snake_case
    });
  });

  describe('Study Session Queries', () => {
    it('should query sessions by userId without column errors', async () => {
      const query = dataSource
        .getRepository('StudySession')
        .createQueryBuilder('session')
        .where('session.userId = :userId', { userId: 'test-user-id' })
        .andWhere('session.startTime >= :startDate', { startDate: new Date() });

      const sql = query.getSql();

      expect(sql).toContain('user_id'); // Should be snake_case
      expect(sql).toContain('start_time');
    });

    it('should query weekly stats correctly', async () => {
      const startOfWeek = new Date();

      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

      const query = dataSource
        .getRepository('StudySession')
        .createQueryBuilder('session')
        .where('session.userId = :userId', { userId: 'test-user-id' })
        .andWhere('session.startTime >= :startOfWeek', { startOfWeek })
        .andWhere('session.completed = :completed', { completed: true });

      const sql = query.getSql();

      expect(sql).toContain('user_id');
      expect(sql).toContain('start_time');
      expect(sql).toContain('completed');
    });
  });

  describe('Rating Queries', () => {
    it('should query ratings by materialId without column errors', async () => {
      const query = dataSource
        .getRepository('MaterialRating')
        .createQueryBuilder('rating')
        .select('AVG(rating.value)', 'avg')
        .where('rating.materialId = :materialId', { materialId: 'test-id' });

      const sql = query.getSql();

      expect(sql).toContain('material_id'); // Should be snake_case
    });
  });

  describe('User Badge Queries', () => {
    it('should query badges by userId without column errors', async () => {
      const query = dataSource
        .getRepository('UserBadge')
        .createQueryBuilder('badge')
        .where('badge.userId = :userId', { userId: 'test-user-id' })
        .orderBy('badge.unlockedAt', 'DESC');

      const sql = query.getSql();

      expect(sql).toContain('user_id');
      expect(sql).toContain('unlocked_at');
    });
  });
});

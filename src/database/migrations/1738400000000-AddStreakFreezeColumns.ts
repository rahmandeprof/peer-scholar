import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStreakFreezeColumns1738400000000 implements MigrationInterface {
  name = 'AddStreakFreezeColumns1738400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add weekly_active_days column
    await queryRunner.query(`
      ALTER TABLE "study_streak"
      ADD COLUMN IF NOT EXISTS "weekly_active_days" integer NOT NULL DEFAULT 0
    `);

    // Add streak_freezes column
    await queryRunner.query(`
      ALTER TABLE "study_streak"
      ADD COLUMN IF NOT EXISTS "streak_freezes" integer NOT NULL DEFAULT 0
    `);

    // Add week_start_date column
    await queryRunner.query(`
      ALTER TABLE "study_streak"
      ADD COLUMN IF NOT EXISTS "week_start_date" date
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "study_streak" DROP COLUMN IF EXISTS "week_start_date"`,
    );
    await queryRunner.query(
      `ALTER TABLE "study_streak" DROP COLUMN IF EXISTS "streak_freezes"`,
    );
    await queryRunner.query(
      `ALTER TABLE "study_streak" DROP COLUMN IF EXISTS "weekly_active_days"`,
    );
  }
}

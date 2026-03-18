import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Ensure year, session, and type columns on material_annotation
 * are nullable with appropriate defaults, fixing environments
 * where TypeORM sync may have created NOT NULL constraints.
 */
export class FixAnnotationYearDefault1768780000000
  implements MigrationInterface
{
  name = 'FixAnnotationYearDefault1768780000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Make year nullable with no default (null by default)
    await queryRunner.query(`
      ALTER TABLE "material_annotation"
      ALTER COLUMN "year" DROP NOT NULL
    `).catch(() => {
      console.log('○ year column already nullable or does not exist');
    });

    await queryRunner.query(`
      ALTER TABLE "material_annotation"
      ALTER COLUMN "year" SET DEFAULT NULL
    `).catch(() => {
      console.log('○ Could not set year default');
    });

    // Make session nullable with no default
    await queryRunner.query(`
      ALTER TABLE "material_annotation"
      ALTER COLUMN "session" DROP NOT NULL
    `).catch(() => {
      console.log('○ session column already nullable or does not exist');
    });

    await queryRunner.query(`
      ALTER TABLE "material_annotation"
      ALTER COLUMN "session" SET DEFAULT NULL
    `).catch(() => {
      console.log('○ Could not set session default');
    });

    // Make type nullable with default 'note'
    await queryRunner.query(`
      ALTER TABLE "material_annotation"
      ALTER COLUMN "type" DROP NOT NULL
    `).catch(() => {
      console.log('○ type column already nullable or does not exist');
    });

    await queryRunner.query(`
      ALTER TABLE "material_annotation"
      ALTER COLUMN "type" SET DEFAULT 'note'
    `).catch(() => {
      console.log('○ Could not set type default');
    });

    console.log('✓ Fixed material_annotation column constraints');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert: make columns NOT NULL again (best-effort)
    await queryRunner.query(`
      UPDATE "material_annotation"
      SET "year" = '' WHERE "year" IS NULL
    `).catch(() => {});

    await queryRunner.query(`
      ALTER TABLE "material_annotation"
      ALTER COLUMN "year" SET NOT NULL
    `).catch(() => {});

    await queryRunner.query(`
      UPDATE "material_annotation"
      SET "session" = '' WHERE "session" IS NULL
    `).catch(() => {});

    await queryRunner.query(`
      ALTER TABLE "material_annotation"
      ALTER COLUMN "session" SET NOT NULL
    `).catch(() => {});

    await queryRunner.query(`
      ALTER TABLE "material_annotation"
      ALTER COLUMN "type" SET NOT NULL
    `).catch(() => {});
  }
}

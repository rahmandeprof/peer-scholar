import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMultiUniversitySupport1765800000000
  implements MigrationInterface
{
  name = 'AddMultiUniversitySupport1765800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add school_id FK to user table
    await queryRunner.query(`
      ALTER TABLE "user" 
      ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES school(id)
    `);

    // Add school_id FK to material table
    await queryRunner.query(`
      ALTER TABLE material 
      ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES school(id)
    `);

    // Create indexes for performance
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_user_school ON "user"(school_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_material_school ON material(school_id)
    `);

    // Backfill existing users - match by school name string
    await queryRunner.query(`
      UPDATE "user" u 
      SET school_id = s.id 
      FROM school s 
      WHERE LOWER(u.school) = LOWER(s.name) 
        AND u.school_id IS NULL
    `);

    // Backfill materials - inherit school_id from uploader
    await queryRunner.query(`
      UPDATE material m
      SET school_id = u.school_id
      FROM "user" u
      WHERE m.uploader_id = u.id 
        AND u.school_id IS NOT NULL
        AND m.school_id IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_material_school`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_user_school`);
    await queryRunner.query(
      `ALTER TABLE material DROP COLUMN IF EXISTS school_id`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN IF EXISTS school_id`,
    );
  }
}

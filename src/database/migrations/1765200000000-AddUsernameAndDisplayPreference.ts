import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUsernameAndDisplayPreference1765200000000 implements MigrationInterface {
    name = 'AddUsernameAndDisplayPreference1765200000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add username column
        await queryRunner.query(`
      ALTER TABLE "user" 
      ADD COLUMN IF NOT EXISTS "username" VARCHAR(50)
    `);

        // Add display_name_preference column with default
        await queryRunner.query(`
      ALTER TABLE "user" 
      ADD COLUMN IF NOT EXISTS "display_name_preference" VARCHAR(20) DEFAULT 'fullname'
    `);

        // Set initial usernames from email prefix for existing users
        await queryRunner.query(`
      UPDATE "user" 
      SET "username" = SPLIT_PART(email, '@', 1) 
      WHERE "username" IS NULL
    `);

        // Create unique index on username (optional - prevents duplicates)
        await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_user_username_unique" 
      ON "user" ("username") 
      WHERE "username" IS NOT NULL
    `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_user_username_unique"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN IF EXISTS "display_name_preference"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN IF EXISTS "username"`);
    }
}

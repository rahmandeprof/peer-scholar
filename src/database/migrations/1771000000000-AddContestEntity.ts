import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddContestEntity1771000000000 implements MigrationInterface {
  name = 'AddContestEntity1771000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "contest" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "name" character varying NOT NULL,
        "description" text,
        "start_date" TIMESTAMP NOT NULL,
        "end_date" TIMESTAMP NOT NULL,
        "is_active" boolean NOT NULL DEFAULT false,
        "prize_config" jsonb,
        "rules" text,
        CONSTRAINT "PK_contest" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "referral" 
      ADD COLUMN IF NOT EXISTS "qualified_at" TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "disqualified_at" TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "disqualification_reason" text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "referral" 
      DROP COLUMN IF EXISTS "qualified_at",
      DROP COLUMN IF EXISTS "disqualified_at",
      DROP COLUMN IF EXISTS "disqualification_reason"
    `);
    await queryRunner.query(`DROP TABLE "contest"`);
  }
}

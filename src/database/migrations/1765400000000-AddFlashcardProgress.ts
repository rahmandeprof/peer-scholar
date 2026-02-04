import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFlashcardProgress1765400000000 implements MigrationInterface {
  name = 'AddFlashcardProgress1765400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "flashcard_progress" (
                "id" varchar PRIMARY KEY NOT NULL,
                "user_id" varchar NOT NULL,
                "material_id" varchar NOT NULL,
                "card_index" integer NOT NULL,
                "ease_factor" float DEFAULT 2.5 NOT NULL,
                "interval" integer DEFAULT 0 NOT NULL,
                "repetitions" integer DEFAULT 0 NOT NULL,
                "next_review_date" timestamp,
                "last_reviewed_at" timestamp,
                "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
                "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
            )
        `);

    // Create indexes for efficient queries
    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_flashcard_progress_user_material" 
            ON "flashcard_progress" ("user_id", "material_id")
        `);
    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_flashcard_progress_user_next_review" 
            ON "flashcard_progress" ("user_id", "next_review_date")
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_flashcard_progress_user_next_review"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_flashcard_progress_user_material"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "flashcard_progress"`);
  }
}

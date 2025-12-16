import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateQuizResultTable1765500000000 implements MigrationInterface {
    name = 'CreateQuizResultTable1765500000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create quiz_result table
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "quiz_result" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "score" integer NOT NULL,
        "total_questions" integer NOT NULL,
        "user_id" uuid,
        "material_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        CONSTRAINT "PK_quiz_result" PRIMARY KEY ("id")
      )
    `);

        // Add foreign key constraints
        await queryRunner.query(`
      ALTER TABLE "quiz_result" 
      ADD CONSTRAINT "FK_quiz_result_user" 
      FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

        await queryRunner.query(`
      ALTER TABLE "quiz_result" 
      ADD CONSTRAINT "FK_quiz_result_material" 
      FOREIGN KEY ("material_id") REFERENCES "material"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

        // Create indexes for better query performance
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_quiz_result_user" ON "quiz_result" ("user_id")
    `);
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_quiz_result_material" ON "quiz_result" ("material_id")
    `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_quiz_result_material"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_quiz_result_user"`);

        // Drop foreign key constraints
        await queryRunner.query(`
      ALTER TABLE "quiz_result" DROP CONSTRAINT IF EXISTS "FK_quiz_result_material"
    `);
        await queryRunner.query(`
      ALTER TABLE "quiz_result" DROP CONSTRAINT IF EXISTS "FK_quiz_result_user"
    `);

        // Drop table
        await queryRunner.query(`DROP TABLE IF EXISTS "quiz_result"`);
    }
}

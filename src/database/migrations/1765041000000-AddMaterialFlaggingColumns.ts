import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMaterialFlaggingColumns1765041000000
  implements MigrationInterface
{
  name = 'AddMaterialFlaggingColumns1765041000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add flag_count column to material table
    await queryRunner.query(`
      ALTER TABLE "material" 
      ADD COLUMN IF NOT EXISTS "flag_count" integer DEFAULT 0
    `);

    // Add is_hidden column to material table
    await queryRunner.query(`
      ALTER TABLE "material" 
      ADD COLUMN IF NOT EXISTS "is_hidden" boolean DEFAULT false
    `);

    // Create material_flag table for tracking individual reports
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "material_flag" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "reason" character varying NOT NULL,
        "description" text,
        "status" character varying NOT NULL DEFAULT 'pending',
        "material_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        CONSTRAINT "PK_material_flag" PRIMARY KEY ("id"),
        CONSTRAINT "FK_material_flag_material" FOREIGN KEY ("material_id") REFERENCES "material"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_material_flag_user" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE
      )
    `);

    // Unique constraint: one user can only flag a material once
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_material_flag_user_material" 
      ON "material_flag" ("material_id", "user_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop unique index
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_material_flag_user_material"`,
    );

    // Drop material_flag table
    await queryRunner.query(`DROP TABLE IF EXISTS "material_flag"`);

    // Remove columns from material table
    await queryRunner.query(
      `ALTER TABLE "material" DROP COLUMN IF EXISTS "is_hidden"`,
    );
    await queryRunner.query(
      `ALTER TABLE "material" DROP COLUMN IF EXISTS "flag_count"`,
    );
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDocumentSegmentsAndProcessingStatus1702300000000
    implements MigrationInterface {
    name = 'AddDocumentSegmentsAndProcessingStatus1702300000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create document_segment table
        await queryRunner.query(`
      CREATE TABLE "document_segment" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "material_id" uuid NOT NULL,
        "page_start" integer,
        "page_end" integer,
        "heading" varchar(500),
        "text" text NOT NULL,
        "token_count" integer NOT NULL,
        "segment_index" integer NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_document_segment" PRIMARY KEY ("id"),
        CONSTRAINT "FK_document_segment_material" FOREIGN KEY ("material_id") 
          REFERENCES "material"("id") ON DELETE CASCADE
      )
    `);

        // Create index for efficient lookup by material
        await queryRunner.query(`
      CREATE INDEX "idx_segment_material" ON "document_segment" ("material_id")
    `);

        // Add processing_status column to material
        await queryRunner.query(`
      ALTER TABLE "material" 
      ADD COLUMN IF NOT EXISTS "processing_status" varchar(20) DEFAULT 'pending'
    `);

        // Add material_version column to material
        await queryRunner.query(`
      ALTER TABLE "material" 
      ADD COLUMN IF NOT EXISTS "material_version" integer DEFAULT 1
    `);

        // Set processing_status to 'completed' for materials that already have content
        await queryRunner.query(`
      UPDATE "material" 
      SET "processing_status" = 'completed' 
      WHERE "content" IS NOT NULL AND LENGTH("content") > 50
    `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop index
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_segment_material"`);

        // Drop document_segment table
        await queryRunner.query(`DROP TABLE IF EXISTS "document_segment"`);

        // Remove columns from material
        await queryRunner.query(`
      ALTER TABLE "material" DROP COLUMN IF EXISTS "processing_status"
    `);
        await queryRunner.query(`
      ALTER TABLE "material" DROP COLUMN IF EXISTS "material_version"
    `);
    }
}

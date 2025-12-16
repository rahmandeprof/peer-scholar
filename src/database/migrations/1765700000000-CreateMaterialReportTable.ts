import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMaterialReportTable1765700000000 implements MigrationInterface {
    name = 'CreateMaterialReportTable1765700000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create material_report table
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "material_report" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "material_id" uuid,
        "reporter_id" uuid,
        "reason" character varying NOT NULL,
        "description" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        CONSTRAINT "PK_material_report" PRIMARY KEY ("id")
      )
    `);

        // Add foreign key constraints only if they don't exist
        const materialFkExists = await queryRunner.query(`
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'FK_material_report_material' 
      AND table_name = 'material_report'
    `);

        if (materialFkExists.length === 0) {
            await queryRunner.query(`
        ALTER TABLE "material_report" 
        ADD CONSTRAINT "FK_material_report_material" 
        FOREIGN KEY ("material_id") REFERENCES "material"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      `);
        }

        const reporterFkExists = await queryRunner.query(`
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'FK_material_report_reporter' 
      AND table_name = 'material_report'
    `);

        if (reporterFkExists.length === 0) {
            await queryRunner.query(`
        ALTER TABLE "material_report" 
        ADD CONSTRAINT "FK_material_report_reporter" 
        FOREIGN KEY ("reporter_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      `);
        }

        // Create indexes for better query performance
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_material_report_material" ON "material_report" ("material_id")
    `);
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_material_report_reporter" ON "material_report" ("reporter_id")
    `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_material_report_reporter"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_material_report_material"`);

        // Drop foreign key constraints
        await queryRunner.query(`
      ALTER TABLE "material_report" DROP CONSTRAINT IF EXISTS "FK_material_report_reporter"
    `);
        await queryRunner.query(`
      ALTER TABLE "material_report" DROP CONSTRAINT IF EXISTS "FK_material_report_material"
    `);

        // Drop table
        await queryRunner.query(`DROP TABLE IF EXISTS "material_report"`);
    }
}

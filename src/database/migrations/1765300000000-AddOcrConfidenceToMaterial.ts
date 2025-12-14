import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOcrConfidenceToMaterial1765300000000 implements MigrationInterface {
    name = 'AddOcrConfidenceToMaterial1765300000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "material" ADD COLUMN IF NOT EXISTS "is_ocr_processed" boolean DEFAULT false
        `);
        await queryRunner.query(`
            ALTER TABLE "material" ADD COLUMN IF NOT EXISTS "ocr_confidence" float
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "material" DROP COLUMN IF EXISTS "ocr_confidence"
        `);
        await queryRunner.query(`
            ALTER TABLE "material" DROP COLUMN IF EXISTS "is_ocr_processed"
        `);
    }
}

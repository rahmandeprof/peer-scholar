import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeletedAtToContest1772000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.hasColumn('contest', 'deleted_at');

    if (!hasColumn) {
      await queryRunner.query(
        `ALTER TABLE "contest" ADD COLUMN "deleted_at" TIMESTAMP`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "contest" DROP COLUMN IF EXISTS "deleted_at"`,
    );
  }
}

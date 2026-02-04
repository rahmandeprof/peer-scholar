import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTimerSettings1765040000000 implements MigrationInterface {
  name = 'AddTimerSettings1765040000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "studyDuration" integer NOT NULL DEFAULT 1500`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD "testDuration" integer NOT NULL DEFAULT 300`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD "restDuration" integer NOT NULL DEFAULT 600`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "restDuration"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "testDuration"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "studyDuration"`);
  }
}

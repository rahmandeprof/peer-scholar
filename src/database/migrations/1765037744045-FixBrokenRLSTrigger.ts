import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixBrokenRLSTrigger1765037744045 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the broken event trigger if it exists
    await queryRunner.query(
      `DROP EVENT TRIGGER IF EXISTS enable_rls_on_new_table`,
    );
    // Drop the function if it exists
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS enable_rls_on_new_table CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No need to restore the broken trigger
  }
}

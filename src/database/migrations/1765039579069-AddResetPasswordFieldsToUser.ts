import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddResetPasswordFieldsToUser1765039579069
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if lowercase columns exist (created manually or by mistake)
    const hasLowercaseToken = await queryRunner.hasColumn(
      'user',
      'resetpasswordtoken',
    );
    const hasLowercaseExpires = await queryRunner.hasColumn(
      'user',
      'resetpasswordexpires',
    );

    if (hasLowercaseToken) {
      await queryRunner.renameColumn(
        'user',
        'resetpasswordtoken',
        'resetPasswordToken',
      );
    } else {
      // Check if it already exists (idempotency)
      const hasToken = await queryRunner.hasColumn(
        'user',
        'resetPasswordToken',
      );

      if (!hasToken) {
        await queryRunner.query(
          `ALTER TABLE "user" ADD "resetPasswordToken" character varying`,
        );
      }
    }

    if (hasLowercaseExpires) {
      await queryRunner.renameColumn(
        'user',
        'resetpasswordexpires',
        'resetPasswordExpires',
      );
    } else {
      const hasExpires = await queryRunner.hasColumn(
        'user',
        'resetPasswordExpires',
      );

      if (!hasExpires) {
        await queryRunner.query(
          `ALTER TABLE "user" ADD "resetPasswordExpires" TIMESTAMP`,
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN "resetPasswordExpires"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN "resetPasswordToken"`,
    );
  }
}

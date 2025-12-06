import { MigrationInterface, QueryRunner } from "typeorm";

export class AddResetPasswordFieldsToUser1765039579069 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "user" ADD "resetPasswordToken" character varying`
        );
        await queryRunner.query(
            `ALTER TABLE "user" ADD "resetPasswordExpires" TIMESTAMP`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "user" DROP COLUMN "resetPasswordExpires"`
        );
        await queryRunner.query(
            `ALTER TABLE "user" DROP COLUMN "resetPasswordToken"`
        );
    }

}

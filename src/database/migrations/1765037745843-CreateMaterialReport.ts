import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateMaterialReport1765037745843 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "material_report" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
        "reason" character varying NOT NULL, 
        "description" text, 
        "materialId" uuid, 
        "reporterId" uuid, 
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(), 
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), 
        "deletedAt" TIMESTAMP, 
        CONSTRAINT "PK_material_report_id" PRIMARY KEY ("id")
      )`
        );

        // Add foreign keys
        await queryRunner.query(
            `ALTER TABLE "material_report" ADD CONSTRAINT "FK_material_report_material" FOREIGN KEY ("materialId") REFERENCES "material"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "material_report" ADD CONSTRAINT "FK_material_report_reporter" FOREIGN KEY ("reporterId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "material_report" DROP CONSTRAINT "FK_material_report_reporter"`);
        await queryRunner.query(`ALTER TABLE "material_report" DROP CONSTRAINT "FK_material_report_material"`);
        await queryRunner.query(`DROP TABLE "material_report"`);
    }
}



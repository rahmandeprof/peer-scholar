import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFacultyDepartmentFKToUser1767840000000
  implements MigrationInterface
{
  name = 'AddFacultyDepartmentFKToUser1767840000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add faculty_id column
    await queryRunner.query(`
      ALTER TABLE "user" 
      ADD COLUMN IF NOT EXISTS "faculty_id" uuid NULL
    `);

    // Add department_id column
    await queryRunner.query(`
      ALTER TABLE "user" 
      ADD COLUMN IF NOT EXISTS "department_id" uuid NULL
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "user" 
      ADD CONSTRAINT "FK_user_faculty" 
      FOREIGN KEY ("faculty_id") REFERENCES "faculty"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "user" 
      ADD CONSTRAINT "FK_user_department" 
      FOREIGN KEY ("department_id") REFERENCES "department"("id") ON DELETE SET NULL
    `);

    // Create indexes for faster lookups
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_user_faculty_id" ON "user"("faculty_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_user_department_id" ON "user"("department_id")
    `);

    console.log('✅ Added faculty_id and department_id columns to user table');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_department_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_faculty_id"`);
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT IF EXISTS "FK_user_department"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT IF EXISTS "FK_user_faculty"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN IF EXISTS "department_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN IF EXISTS "faculty_id"`,
    );
  }
}

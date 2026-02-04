import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHealthSciencesDepartments1765051000000
  implements MigrationInterface
{
  name = 'AddHealthSciencesDepartments1765051000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // First, find the faculty ID for "College of Health Sciences"
    const facultyResult = await queryRunner.query(`
            SELECT id FROM faculty WHERE name = 'College of Health Sciences' LIMIT 1
        `);

    if (facultyResult.length === 0) {
      console.log(
        'College of Health Sciences faculty not found, skipping department insertion',
      );

      return;
    }

    const facultyId = facultyResult[0].id;

    // Insert new departments if they don't already exist
    const newDepartments = [
      'Medical Lab Science (MLS)',
      'Physiotherapy',
      'Optometry',
    ];

    for (const deptName of newDepartments) {
      // Check if department already exists
      const existing = await queryRunner.query(
        `SELECT id FROM department WHERE name = $1 AND "facultyId" = $2 LIMIT 1`,
        [deptName, facultyId],
      );

      if (existing.length === 0) {
        await queryRunner.query(
          `INSERT INTO department (id, name, "facultyId", "createdAt", "updatedAt") 
                     VALUES (uuid_generate_v4(), $1, $2, NOW(), NOW())`,
          [deptName, facultyId],
        );
        console.log(`Added department: ${deptName}`);
      } else {
        console.log(`Department already exists: ${deptName}`);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the departments we added
    const departmentsToRemove = [
      'Medical Lab Science (MLS)',
      'Physiotherapy',
      'Optometry',
    ];

    for (const deptName of departmentsToRemove) {
      await queryRunner.query(`DELETE FROM department WHERE name = $1`, [
        deptName,
      ]);
      console.log(`Removed department: ${deptName}`);
    }
  }
}

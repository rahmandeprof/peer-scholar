import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUDUSUniversity1765900000000 implements MigrationInterface {
    name = 'AddUDUSUniversity1765900000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Create UDUS school if it doesn't exist
        const schoolResult = await queryRunner.query(`
      SELECT id FROM school WHERE name = 'Usmanu Danfodiyo University' LIMIT 1
    `);

        let schoolId: string;

        if (schoolResult.length === 0) {
            const insertResult = await queryRunner.query(`
        INSERT INTO school (id, name, country, created_at, updated_at) 
        VALUES (uuid_generate_v4(), 'Usmanu Danfodiyo University', 'Nigeria', NOW(), NOW())
        RETURNING id
      `);
            schoolId = insertResult[0].id;
            console.log('Created school: Usmanu Danfodiyo University');
        } else {
            schoolId = schoolResult[0].id;
            console.log('School already exists: Usmanu Danfodiyo University');
        }

        // 2. Create Faculty of Health and Applied Sciences if it doesn't exist
        const facultyResult = await queryRunner.query(
            `SELECT id FROM faculty WHERE name = $1 AND school_id = $2 LIMIT 1`,
            ['Faculty of Health and Applied Sciences', schoolId],
        );

        let facultyId: string;

        if (facultyResult.length === 0) {
            const insertResult = await queryRunner.query(
                `INSERT INTO faculty (id, name, school_id, created_at, updated_at) 
         VALUES (uuid_generate_v4(), $1, $2, NOW(), NOW())
         RETURNING id`,
                ['Faculty of Health and Applied Sciences', schoolId],
            );
            facultyId = insertResult[0].id;
            console.log('Created faculty: Faculty of Health and Applied Sciences');
        } else {
            facultyId = facultyResult[0].id;
            console.log('Faculty already exists: Faculty of Health and Applied Sciences');
        }

        // 3. Insert departments
        const departments = [
            'Nursing',
            'Physiotherapy',
            'Optometry',
            'Radiography',
            'Nutrition and Dietetics',
        ];

        for (const deptName of departments) {
            const existing = await queryRunner.query(
                `SELECT id FROM department WHERE name = $1 AND faculty_id = $2 LIMIT 1`,
                [deptName, facultyId],
            );

            if (existing.length === 0) {
                await queryRunner.query(
                    `INSERT INTO department (id, name, faculty_id, created_at, updated_at) 
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
        // Remove departments
        const departments = [
            'Nursing',
            'Physiotherapy',
            'Optometry',
            'Radiography',
            'Nutrition and Dietetics',
        ];

        for (const deptName of departments) {
            await queryRunner.query(`DELETE FROM department WHERE name = $1`, [
                deptName,
            ]);
            console.log(`Removed department: ${deptName}`);
        }

        // Remove faculty
        await queryRunner.query(
            `DELETE FROM faculty WHERE name = 'Faculty of Health and Applied Sciences'`,
        );
        console.log('Removed faculty: Faculty of Health and Applied Sciences');

        // Remove school (only if no other faculties exist)
        await queryRunner.query(`
      DELETE FROM school 
      WHERE name = 'Usmanu Danfodiyo University' 
        AND NOT EXISTS (SELECT 1 FROM faculty WHERE school_id = school.id)
    `);
        console.log('Removed school: Usmanu Danfodiyo University (if no faculties remain)');
    }
}

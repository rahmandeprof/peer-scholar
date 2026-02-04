import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Seed University of Ilorin and all its faculties/departments into the database.
 * Data sourced from client/src/data/unilorin-faculties.ts
 */
export class AddUnilorinUniversity1766000000000 implements MigrationInterface {
  name = 'AddUnilorinUniversity1766000000000';

  private readonly UNILORIN_FACULTIES = [
    {
      name: 'Faculty of Management Sciences',
      departments: [
        'Marketing',
        'Business Administration',
        'Accounting',
        'Finance',
        'Public Administration',
        'Industrial Relations and Personnel Management',
      ],
    },
    {
      name: 'Faculty Of Agriculture',
      departments: [
        'Home Economics',
        'Forestry And Wild Life Management',
        'Food Science',
        'Agriculture',
      ],
    },
    {
      name: 'Faculty Of Arts And Humanities',
      departments: [
        'Yoruba',
        'Performing Arts',
        'Linguistics',
        'Islamic Studies',
        'History And International Studies',
        'French',
        'English Language',
        'Comparative Religious Studies',
        'Christian Studies',
        'Arabic Studies',
      ],
    },
    {
      name: 'Faculty Of Education',
      departments: [
        'Educational Technology',
        'Social Science Education',
        'Human Kinetics',
        'Environmental and Health Promotion',
        'Educational Management',
        'Counselor Education',
        'Computer Science Education',
        'Arts Education',
        'Science Education',
        'Adult and Primary Education',
      ],
    },
    {
      name: 'Faculty of Communication and Information Sciences',
      departments: [
        'Telecommunication Science',
        'Library And Information Science',
        'Computer Science',
        'Information Technology',
        'Mass Communication',
      ],
    },
    {
      name: 'Faculty of Environmental Sciences',
      departments: [
        'Architecture',
        'Urban And Regional Planning',
        'Quantity Surveying And Geoinformatics',
        'Estate Management',
      ],
    },
    {
      name: 'Faculty Of Engineering',
      departments: [
        'Agricultural And Biosystems Engineering',
        'Computer Engineering',
        'Chemical Engineering',
        'Biomedical Engineering',
        'Water Resources And Environmental Engineering',
        'Metallurgical And Material Engineering',
        'Mechanical Engineering',
        'Electrical/Electronics',
        'Civil Engineering',
        'Food Engineering',
      ],
    },
    {
      name: 'Faculty Of Law',
      departments: ['Common Law', 'Common And Islamic Law'],
    },
    {
      name: 'Med/Pharm/Health Sciences',
      departments: [
        'Veterinary Medicine',
        'Physiology',
        'Pharmacy',
        'Nursing/Nursing Sciences',
        'Anatomy',
        'Medicine And Surgery',
        'Medical Laboratory Science (MLS)',
        'Physiotherapy',
      ],
    },
    {
      name: 'Faculty Of Physical/Life Sciences',
      departments: [
        'Biochemistry',
        'Zoology',
        'Statistics',
        'Plant Biology',
        'Physics',
        'Microbiology',
        'Mathematics',
        'Industrial Chemistry',
        'Geology',
        'Chemistry',
        'Biology',
        'Optometry and Vision Sciences',
      ],
    },
    {
      name: 'Faculty Of Social Sciences',
      departments: [
        'Psychology',
        'Political Sciences',
        'Geography And Environmental Management',
        'Economics',
        'Sociology',
        'Social Work',
        'Criminology',
      ],
    },
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create University of Ilorin if it doesn't exist
    const schoolResult = await queryRunner.query(`
      SELECT id FROM school WHERE name = 'University of Ilorin' LIMIT 1
    `);

    let schoolId: string;

    if (schoolResult.length === 0) {
      const insertResult = await queryRunner.query(`
        INSERT INTO school (id, name, country, created_at, updated_at) 
        VALUES (uuid_generate_v4(), 'University of Ilorin', 'Nigeria', NOW(), NOW())
        RETURNING id
      `);

      schoolId = insertResult[0].id;
      console.log('Created school: University of Ilorin');
    } else {
      schoolId = schoolResult[0].id;
      console.log('School already exists: University of Ilorin');
    }

    // 2. Create faculties and departments
    for (const facultyData of this.UNILORIN_FACULTIES) {
      // Check if faculty exists
      const facultyResult = await queryRunner.query(
        `SELECT id FROM faculty WHERE name = $1 AND school_id = $2 LIMIT 1`,
        [facultyData.name, schoolId],
      );

      let facultyId: string;

      if (facultyResult.length === 0) {
        const insertResult = await queryRunner.query(
          `INSERT INTO faculty (id, name, school_id, created_at, updated_at) 
           VALUES (uuid_generate_v4(), $1, $2, NOW(), NOW())
           RETURNING id`,
          [facultyData.name, schoolId],
        );

        facultyId = insertResult[0].id;
        console.log(`Created faculty: ${facultyData.name}`);
      } else {
        facultyId = facultyResult[0].id;
        console.log(`Faculty already exists: ${facultyData.name}`);
      }

      // 3. Create departments
      for (const deptName of facultyData.departments) {
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
          console.log(`  Added department: ${deptName}`);
        } else {
          console.log(`  Department already exists: ${deptName}`);
        }
      }
    }

    // 4. Backfill existing users - link users with school='University of Ilorin' to schoolId
    const backfillResult = await queryRunner.query(
      `UPDATE "user" 
       SET school_id = $1 
       WHERE LOWER(school) LIKE '%ilorin%' 
         AND school_id IS NULL
       RETURNING id`,
      [schoolId],
    );

    console.log(
      `Backfilled ${backfillResult.length} users to University of Ilorin`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Get school ID
    const schoolResult = await queryRunner.query(`
      SELECT id FROM school WHERE name = 'University of Ilorin' LIMIT 1
    `);

    if (schoolResult.length === 0) return;

    const schoolId = schoolResult[0].id;

    // Clear user school_id references
    await queryRunner.query(
      `UPDATE "user" SET school_id = NULL WHERE school_id = $1`,
      [schoolId],
    );

    // Delete departments (via faculty cascade would work, but being explicit)
    await queryRunner.query(
      `
      DELETE FROM department 
      WHERE faculty_id IN (SELECT id FROM faculty WHERE school_id = $1)
    `,
      [schoolId],
    );

    // Delete faculties
    await queryRunner.query(`DELETE FROM faculty WHERE school_id = $1`, [
      schoolId,
    ]);

    // Delete school
    await queryRunner.query(`DELETE FROM school WHERE id = $1`, [schoolId]);

    console.log('Removed University of Ilorin and all related data');
  }
}

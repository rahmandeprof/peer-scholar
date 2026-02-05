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
        'Business Administration',
        'Finance',
        'Marketing',
        'Industrial Relations and Personnel Management',
        'Public Administration',
      ],
    },
    {
      name: 'Faculty of Social Sciences',
      departments: [
        'Political Science',
        'Economics',
        'Geography and Environmental Management',
        'Sociology',
        'Social Work',
        'Criminology and Security Studies',
      ],
    },
    {
      name: 'Faculty of Communication and Information Sciences',
      departments: [
        'Mass Communication',
        'Library and Information Science',
        'Telecommunication Science',
        'Information and Communication Science',
        'Computer Science',
      ],
    },
    {
      name: 'Faculty of Education',
      departments: [
        'Science Education',
        'Educational Technology',
        'Educational Management',
        'Human Kinetics Education',
        'Health Education',
        'Social Sciences Education',
        'Adult and Primary Education',
        'Arts Education',
        'Counsellor Education',
      ],
    },
    {
      name: 'Faculty of Arts',
      departments: [
        'English',
        'French',
        'History and International Studies',
        'Linguistics and Nigerian Languages',
        'Performing Arts',
        'Religions',
      ],
    },
    {
      name: 'Faculty of Physical Sciences',
      departments: [
        'Chemistry',
        'Physics',
        'Geology',
        'Mathematics',
        'Statistics',
        'Industrial Chemistry',
        'Geophysics',
      ],
    },
    {
      name: 'Faculty of Life Sciences',
      departments: [
        'Biochemistry',
        'Microbiology',
        'Plant Biology',
        'Zoology',
        'Optometry and Vision Science',
      ],
    },
    {
      name: 'Faculty of Engineering and Technology',
      departments: [
        'Biomedical Engineering',
        'Chemical Engineering',
        'Civil Engineering',
        'Computer Engineering',
        'Electrical and Electronics Engineering',
        'Food Engineering',
        'Materials and Metallurgical Engineering',
        'Mechanical Engineering',
        'Water Resources and Environmental Engineering',
        'Agricultural and Biosystems Engineering',
      ],
    },
    {
      name: 'Faculty of Environmental Sciences',
      departments: [
        'Architecture',
        'Estate Management',
        'Quantity Surveying',
        'Surveying and Geoinformatics',
        'Urban and Regional Planning',
      ],
    },
    {
      name: 'Faculty of Law',
      departments: ['Common Law', 'Common and Islamic Law'],
    },
    {
      name: 'Faculty of Basic Medical Sciences',
      departments: [
        'Anatomy',
        'Physiology',
        'Pharmacology and Therapeutics',
        'Chemical Pathology and Immunology',
        'Haematology and Blood Transfusion',
        'Medical Microbiology and Parasitology',
        'Pathology',
      ],
    },
    {
      name: 'Faculty of Clinical Sciences',
      departments: [
        'Medicine',
        'Surgery',
        'Obstetrics and Gynaecology',
        'Paediatrics and Child Health',
        'Radiology',
        'Anaesthesia',
        'Ophthalmology',
        'Behavioural Sciences',
        'Otorhinolaryngology',
        'Nursing Science',
      ],
    },
    {
      name: 'Faculty of Agriculture',
      departments: [
        'Agricultural Economics and Farm Management',
        'Agricultural Extension and Rural Development',
        'Agronomy',
        'Animal Production',
        'Crop Protection',
        'Home Economics and Food Science',
        'Forest Resources Management',
        'Aquaculture and Fisheries',
      ],
    },
    {
      name: 'Faculty of Pharmaceutical Sciences',
      departments: [
        'Clinical Pharmacy and Pharmacy Practice',
        'Pharmaceutical and Medicinal Chemistry',
        'Pharmaceutics and Pharmaceutical Technology',
        'Pharmacognosy and Drug Development',
        'Pharmacology and Toxicology',
        'Pharmaceutical Microbiology and Biotechnology',
      ],
    },
    {
      name: 'Faculty of Veterinary Medicine',
      departments: [
        'Veterinary Anatomy',
        'Veterinary Physiology and Biochemistry',
        'Veterinary Parasitology and Entomology',
        'Veterinary Pathology',
        'Veterinary Pharmacology and Toxicology',
        'Veterinary Microbiology',
        'Veterinary Public Health and Preventive Medicine',
        'Veterinary Medicine',
        'Veterinary Surgery',
        'Theriogenology and Production',
      ],
    },
    {
      name: 'College of Health Sciences',
      departments: ['Medical Laboratory Science'],
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

/* eslint-disable no-console */
/* eslint-disable no-await-in-loop */
import { Department } from '../app/academic/entities/department.entity';
import { Faculty } from '../app/academic/entities/faculty.entity';
import { School } from '../app/academic/entities/school.entity';

import { AppDataSource } from '../database/ormconfig';

async function seed() {
  try {
    await AppDataSource.initialize();
    console.log('Data Source has been initialized!');

    const entityManager = AppDataSource.manager;

    const schoolName = 'University of Ilorin';
    let school = await entityManager.findOne(School, {
      where: { name: schoolName },
    });

    if (!school) {
      console.log('Creating school...');
      school = entityManager.create(School, {
        name: schoolName,
        country: 'Nigeria',
      });
      await entityManager.save(school);
    }

    const facultiesData = [
      {
        name: 'Faculty of Administration',
        departments: ['Marketing', 'Business Administration'],
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
          'Igbo',
          'History And International Studies',
          'Hausa',
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
          'Technology Education',
          'Social Studies',
          'Primary Education Studies',
          'Human Kinetics',
          'Health Education',
          'Education Technology/ Introductory Technology',
          'Educational Management',
          'Education And Social Studies',
          'Education And History',
          'Education And Geography',
          'Education And French',
          'Education And English Language',
          'Education And Chemistry',
          'Education And Biology',
          'Education & Yoruba',
          'Education & Physics',
          'Education & Mathematics',
          'Education & Islamic Studies',
          'Education & Economics',
          'Education & Christian Religious Studies',
          'Education & Arabic',
          'Counseling Education',
          'Computer Education',
          'Business Education',
          'Agricultural Science And Education',
          'Adult Education',
        ],
      },
      {
        name: 'Faculty Of Engineering',
        departments: [
          'Architecture',
          'Agricultural And Biosystems Engineering',
          'Chemical Engineering',
          'Biomedical Engineering',
          'Water Resources And Environmental Engineering',
          'Urban And Regional Planning',
          'Telecommunication Sciences',
          'Quantity Surveying Surveying And Geoinformation',
          'Metallurgical And Material Engineering',
          'Mechanical Engineering',
          'Engineering Information And Communication Sciences',
          'Electrical/Electronics',
          'Civil Engineering',
          'Food Engineering',
        ],
      },
      {
        name: 'Faculty Of Law/Legal Studies',
        departments: ['Common Law', 'Common & Islamic Law'],
      },
      {
        name: 'College of Health Sciences',
        departments: [
          'Veterinary Medicine',
          'Physiology',
          'Pharmacy',
          'Nursing/Nursing Sciences',
          'Anatomy',
          'Medicine And Surgery',
        ],
      },
      {
        name: 'Faculty Of Sciences',
        departments: [
          'Biochemistry',
          'Zoology',
          'Statistics',
          'Plant Biology',
          'Physics',
          'Microbiology',
          'Mathematics',
          'Library And Information Sciences',
          'Industrial Chemistry',
          'Geology',
          'Computer Sciences',
          'Chemistry',
          'Biology',
        ],
      },
      {
        name: 'Faculty Of Social Sciences',
        departments: [
          'Psychology',
          'Political Sciences',
          'Mass Communication',
          'Geography And Environmental Management',
          'Finance',
          'Economics',
          'Accounting',
          'Sociology',
          'Social Work',
        ],
      },
    ];

    for (const facultyData of facultiesData) {
      let faculty = await entityManager.findOne(Faculty, {
        where: { name: facultyData.name, school: { id: school.id } },
      });

      if (!faculty) {
        console.log(`Creating faculty: ${facultyData.name}`);
        faculty = entityManager.create(Faculty, {
          name: facultyData.name,
          school,
        });
        await entityManager.save(faculty);
      }

      for (const deptName of facultyData.departments) {
        let department = await entityManager.findOne(Department, {
          where: { name: deptName, faculty: { id: faculty.id } },
        });

        if (!department) {
          console.log(`Creating department: ${deptName}`);
          department = entityManager.create(Department, {
            name: deptName,
            faculty,
          });
          await entityManager.save(department);
        }
      }
    }

    console.log('Seeding completed successfully!');
    await AppDataSource.destroy();
  } catch (err) {
    console.error('Error during seeding:', err);
    process.exit(1);
  }
}

void seed();

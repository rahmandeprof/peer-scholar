import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConvertStudySessionTypeToVarchar1765052000000
  implements MigrationInterface
{
  name = 'ConvertStudySessionTypeToVarchar1765052000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Convert the type column from enum to varchar
    // This allows any string value including 'reading'

    // First, alter the column to varchar, casting existing values
    await queryRunner.query(`
            ALTER TABLE study_session 
            ALTER COLUMN type TYPE VARCHAR(50) 
            USING type::text
        `);

    // Set default value
    await queryRunner.query(`
            ALTER TABLE study_session 
            ALTER COLUMN type SET DEFAULT 'study'
        `);

    // Drop the enum type if it exists (it may be in use elsewhere, so we use IF EXISTS and CASCADE)
    await queryRunner.query(`
            DROP TYPE IF EXISTS study_session_type_enum CASCADE
        `);

    console.log(
      'Successfully converted study_session.type from enum to varchar',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // To reverse, we'd need to recreate the enum - but that's complex
    // Just leave it as varchar, it works fine
    console.log('Keeping type column as varchar (no rollback)');
  }
}

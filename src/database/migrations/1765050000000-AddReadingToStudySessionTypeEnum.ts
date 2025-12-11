import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReadingToStudySessionTypeEnum1765050000000 implements MigrationInterface {
    name = 'AddReadingToStudySessionTypeEnum1765050000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if the enum type exists first
        const enumExists = await queryRunner.query(`
            SELECT EXISTS (
                SELECT 1 FROM pg_type WHERE typname = 'study_session_type_enum'
            );
        `);

        if (enumExists[0]?.exists) {
            // Add 'reading' value to the existing enum
            // PostgreSQL requires ALTER TYPE to add new enum values
            await queryRunner.query(`
                ALTER TYPE study_session_type_enum ADD VALUE IF NOT EXISTS 'reading';
            `);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Note: PostgreSQL doesn't support removing enum values directly
        // To properly reverse this, you'd need to:
        // 1. Create a new enum without 'reading'
        // 2. Update all columns to use the new enum
        // 3. Drop the old enum
        // 4. Rename new enum to old name
        // For simplicity, we do nothing here (the value will remain but be unused)
        console.log('Cannot remove enum value in PostgreSQL without recreating the type');
    }
}

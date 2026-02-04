import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateReadingProgressTable1765100000000
  implements MigrationInterface
{
  name = 'CreateReadingProgressTable1765100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create the reading_progress table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS reading_progress (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id uuid NOT NULL,
        material_id uuid NOT NULL,
        last_page int NOT NULL DEFAULT 1,
        created_at timestamp DEFAULT NOW(),
        updated_at timestamp DEFAULT NOW(),
        CONSTRAINT fk_reading_progress_user 
          FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE,
        CONSTRAINT fk_reading_progress_material 
          FOREIGN KEY (material_id) REFERENCES material(id) ON DELETE CASCADE,
        CONSTRAINT uq_reading_progress_user_material UNIQUE (user_id, material_id)
      )
    `);

    // Create index for faster lookups by user
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_reading_progress_user 
      ON reading_progress(user_id)
    `);

    // Create index for faster lookups by material
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_reading_progress_material 
      ON reading_progress(material_id)
    `);

    // Migrate existing data from user table
    // This preserves any existing progress for users' last read material
    await queryRunner.query(`
      INSERT INTO reading_progress (user_id, material_id, last_page)
      SELECT id, last_read_material_id, last_read_page
      FROM "user"
      WHERE last_read_material_id IS NOT NULL
      ON CONFLICT (user_id, material_id) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_reading_progress_material`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS idx_reading_progress_user`);
    await queryRunner.query(`DROP TABLE IF EXISTS reading_progress`);
  }
}

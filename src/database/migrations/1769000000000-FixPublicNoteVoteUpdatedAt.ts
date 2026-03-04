import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixPublicNoteVoteUpdatedAt1769000000000
  implements MigrationInterface
{
  name = 'FixPublicNoteVoteUpdatedAt1769000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if updated_at exists on public_note_vote, and add it if missing
    const tableInfo = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'public_note_vote' AND column_name = 'updated_at'
    `);

    if (tableInfo.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "public_note_vote" 
        ADD COLUMN "updated_at" TIMESTAMP NOT NULL DEFAULT now()
      `);
      console.log('✓ Added updated_at column to public_note_vote');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "public_note_vote"
      DROP COLUMN IF EXISTS "updated_at"
    `);
  }
}

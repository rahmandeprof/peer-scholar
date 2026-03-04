import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixPublicNoteColumns1770000000000 implements MigrationInterface {
  name = 'FixPublicNoteColumns1770000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ---------------------------------------------------------
    // SAFELY ADD COLUMNS TO public_note_vote
    // ---------------------------------------------------------

    // Add deleted_at to public_note_vote
    const voteDeletedAtInfo = await queryRunner.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'public_note_vote' AND column_name = 'deleted_at'
    `);

    if (voteDeletedAtInfo.length === 0) {
      await queryRunner.query(
        `ALTER TABLE "public_note_vote" ADD COLUMN "deleted_at" TIMESTAMP`,
      );
      console.log('✓ Added deleted_at column to public_note_vote');
    }

    // ---------------------------------------------------------
    // SAFELY ADD COLUMNS TO public_note (just in case they are missing too)
    // ---------------------------------------------------------

    // Add downvotes to public_note
    const noteDownvotesInfo = await queryRunner.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'public_note' AND column_name = 'downvotes'
    `);

    if (noteDownvotesInfo.length === 0) {
      await queryRunner.query(
        `ALTER TABLE "public_note" ADD COLUMN "downvotes" integer NOT NULL DEFAULT 0`,
      );
      console.log('✓ Added downvotes column to public_note');
    }

    // Add updated_at to public_note
    const noteUpdatedAtInfo = await queryRunner.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'public_note' AND column_name = 'updated_at'
    `);

    if (noteUpdatedAtInfo.length === 0) {
      await queryRunner.query(
        `ALTER TABLE "public_note" ADD COLUMN "updated_at" TIMESTAMP NOT NULL DEFAULT now()`,
      );
      console.log('✓ Added updated_at column to public_note');
    }

    // Add deleted_at to public_note
    const noteDeletedAtInfo = await queryRunner.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'public_note' AND column_name = 'deleted_at'
    `);

    if (noteDeletedAtInfo.length === 0) {
      await queryRunner.query(
        `ALTER TABLE "public_note" ADD COLUMN "deleted_at" TIMESTAMP`,
      );
      console.log('✓ Added deleted_at column to public_note');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Down migrations strictly remove the columns we just guaranteed to exist
    await queryRunner.query(
      `ALTER TABLE "public_note_vote" DROP COLUMN IF EXISTS "deleted_at"`,
    );

    await queryRunner.query(
      `ALTER TABLE "public_note" DROP COLUMN IF EXISTS "downvotes"`,
    );
    await queryRunner.query(
      `ALTER TABLE "public_note" DROP COLUMN IF EXISTS "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "public_note" DROP COLUMN IF EXISTS "deleted_at"`,
    );
  }
}

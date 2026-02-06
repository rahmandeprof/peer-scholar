import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class FixMaterialAnnotationColumns1767900000000
  implements MigrationInterface
{
  name = 'FixMaterialAnnotationColumns1767900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Rename 'note' to 'note_content' if 'note' exists and 'note_content' does not
    const table = await queryRunner.getTable('material_annotation');
    const noteColumn = table?.findColumnByName('note');
    const noteContentColumn = table?.findColumnByName('note_content');

    if (noteColumn && !noteContentColumn) {
      await queryRunner.renameColumn(
        'material_annotation',
        'note',
        'note_content',
      );
      console.log('Renamed column "note" to "note_content"');
    } else if (!noteColumn && !noteContentColumn) {
      // If neither exists, create note_content
      await queryRunner.addColumn(
        'material_annotation',
        new TableColumn({
          name: 'note_content',
          type: 'text',
          isNullable: true,
        }),
      );
      console.log('Created column "note_content"');
    }

    // 2. Add 'year' column
    const yearColumn = table?.findColumnByName('year');

    if (!yearColumn) {
      await queryRunner.addColumn(
        'material_annotation',
        new TableColumn({
          name: 'year',
          type: 'character varying',
          isNullable: true,
        }),
      );
      console.log('Created column "year"');
    }

    // 3. Add 'session' column
    const sessionColumn = table?.findColumnByName('session');

    if (!sessionColumn) {
      await queryRunner.addColumn(
        'material_annotation',
        new TableColumn({
          name: 'session',
          type: 'character varying',
          isNullable: true,
        }),
      );
      console.log('Created column "session"');
    }

    // 4. Add 'type' column
    const typeColumn = table?.findColumnByName('type');

    if (!typeColumn) {
      await queryRunner.addColumn(
        'material_annotation',
        new TableColumn({
          name: 'type',
          type: 'character varying',
          default: "'note'",
          isNullable: false,
        }),
      );
      console.log('Created column "type"');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert type
    await queryRunner.dropColumn('material_annotation', 'type');

    // Revert session
    await queryRunner.dropColumn('material_annotation', 'session');

    // Revert year
    await queryRunner.dropColumn('material_annotation', 'year');

    // Revert note_content renaming (rename back to note)
    const table = await queryRunner.getTable('material_annotation');
    const noteContentColumn = table?.findColumnByName('note_content');

    if (noteContentColumn) {
      await queryRunner.renameColumn(
        'material_annotation',
        'note_content',
        'note',
      );
    }
  }
}

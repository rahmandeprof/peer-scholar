import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * This migration ensures all potentially missing tables are created.
 * Uses IF NOT EXISTS to be safe to run on existing databases.
 */
export class CreateMissingTables1765600000000 implements MigrationInterface {
    name = 'CreateMissingTables1765600000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // =====================================================
        // COMMENT TABLE
        // =====================================================
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "comment" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "content" text NOT NULL,
        "user_id" uuid,
        "material_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        CONSTRAINT "PK_comment" PRIMARY KEY ("id")
      )
    `);

        // Add FK only if not exists
        await this.addForeignKeyIfNotExists(
            queryRunner,
            'comment',
            'FK_comment_user',
            'user_id',
            'user',
            'id'
        );
        await this.addForeignKeyIfNotExists(
            queryRunner,
            'comment',
            'FK_comment_material',
            'material_id',
            'material',
            'id'
        );

        // =====================================================
        // USER_BADGE TABLE
        // =====================================================
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_badge" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid,
        "badge_type" character varying NOT NULL,
        "unlocked_at" TIMESTAMP NOT NULL DEFAULT now(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        CONSTRAINT "PK_user_badge" PRIMARY KEY ("id")
      )
    `);

        await this.addForeignKeyIfNotExists(
            queryRunner,
            'user_badge',
            'FK_user_badge_user',
            'user_id',
            'user',
            'id'
        );

        // =====================================================
        // PARTNER_REQUEST TABLE
        // =====================================================
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "partner_request" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "sender_id" uuid,
        "receiver_id" uuid,
        "status" character varying NOT NULL DEFAULT 'pending',
        "last_nudged_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        CONSTRAINT "PK_partner_request" PRIMARY KEY ("id")
      )
    `);

        await this.addForeignKeyIfNotExists(
            queryRunner,
            'partner_request',
            'FK_partner_request_sender',
            'sender_id',
            'user',
            'id'
        );
        await this.addForeignKeyIfNotExists(
            queryRunner,
            'partner_request',
            'FK_partner_request_receiver',
            'receiver_id',
            'user',
            'id'
        );

        // =====================================================
        // MATERIAL_ANNOTATION TABLE
        // =====================================================
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "material_annotation" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "material_id" uuid,
        "user_id" uuid,
        "selected_text" text,
        "note" text,
        "color" character varying DEFAULT 'yellow',
        "page_number" integer,
        "context_before" text,
        "context_after" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        CONSTRAINT "PK_material_annotation" PRIMARY KEY ("id")
      )
    `);

        await this.addForeignKeyIfNotExists(
            queryRunner,
            'material_annotation',
            'FK_material_annotation_material',
            'material_id',
            'material',
            'id'
        );
        await this.addForeignKeyIfNotExists(
            queryRunner,
            'material_annotation',
            'FK_material_annotation_user',
            'user_id',
            'user',
            'id'
        );

        // =====================================================
        // MATERIAL_FAVORITE TABLE
        // =====================================================
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "material_favorite" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid,
        "material_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        CONSTRAINT "PK_material_favorite" PRIMARY KEY ("id")
      )
    `);

        await this.addForeignKeyIfNotExists(
            queryRunner,
            'material_favorite',
            'FK_material_favorite_user',
            'user_id',
            'user',
            'id'
        );
        await this.addForeignKeyIfNotExists(
            queryRunner,
            'material_favorite',
            'FK_material_favorite_material',
            'material_id',
            'material',
            'id'
        );

        // =====================================================
        // MATERIAL_RATING TABLE
        // =====================================================
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "material_rating" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid,
        "material_id" uuid,
        "rating" integer NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        CONSTRAINT "PK_material_rating" PRIMARY KEY ("id")
      )
    `);

        await this.addForeignKeyIfNotExists(
            queryRunner,
            'material_rating',
            'FK_material_rating_user',
            'user_id',
            'user',
            'id'
        );
        await this.addForeignKeyIfNotExists(
            queryRunner,
            'material_rating',
            'FK_material_rating_material',
            'material_id',
            'material',
            'id'
        );

        // =====================================================
        // NOTE TABLE
        // =====================================================
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "note" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid,
        "material_id" uuid,
        "content" text NOT NULL,
        "title" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        CONSTRAINT "PK_note" PRIMARY KEY ("id")
      )
    `);

        await this.addForeignKeyIfNotExists(
            queryRunner,
            'note',
            'FK_note_user',
            'user_id',
            'user',
            'id'
        );
        await this.addForeignKeyIfNotExists(
            queryRunner,
            'note',
            'FK_note_material',
            'material_id',
            'material',
            'id'
        );

        // =====================================================
        // PUBLIC_NOTE TABLE
        // =====================================================
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "public_note" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "material_id" uuid,
        "user_id" uuid,
        "selected_text" text,
        "note" text,
        "page_number" integer,
        "context_before" text,
        "context_after" text,
        "upvotes" integer DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        CONSTRAINT "PK_public_note" PRIMARY KEY ("id")
      )
    `);

        await this.addForeignKeyIfNotExists(
            queryRunner,
            'public_note',
            'FK_public_note_material',
            'material_id',
            'material',
            'id'
        );
        await this.addForeignKeyIfNotExists(
            queryRunner,
            'public_note',
            'FK_public_note_user',
            'user_id',
            'user',
            'id'
        );

        // =====================================================
        // PUBLIC_NOTE_VOTE TABLE
        // =====================================================
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "public_note_vote" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "note_id" uuid,
        "user_id" uuid,
        "value" integer NOT NULL DEFAULT 1,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        CONSTRAINT "PK_public_note_vote" PRIMARY KEY ("id")
      )
    `);

        await this.addForeignKeyIfNotExists(
            queryRunner,
            'public_note_vote',
            'FK_public_note_vote_note',
            'note_id',
            'public_note',
            'id'
        );
        await this.addForeignKeyIfNotExists(
            queryRunner,
            'public_note_vote',
            'FK_public_note_vote_user',
            'user_id',
            'user',
            'id'
        );

        // =====================================================
        // HELPFUL_LINK TABLE
        // =====================================================
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "helpful_link" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "url" character varying NOT NULL,
        "title" character varying NOT NULL,
        "description" text,
        "link_type" character varying DEFAULT 'other',
        "thumbnail_url" character varying,
        "material_id" uuid,
        "added_by_id" uuid,
        "helpful_count" integer DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        CONSTRAINT "PK_helpful_link" PRIMARY KEY ("id")
      )
    `);

        await this.addForeignKeyIfNotExists(
            queryRunner,
            'helpful_link',
            'FK_helpful_link_material',
            'material_id',
            'material',
            'id'
        );
        await this.addForeignKeyIfNotExists(
            queryRunner,
            'helpful_link',
            'FK_helpful_link_user',
            'added_by_id',
            'user',
            'id'
        );

        // =====================================================
        // PERSONAL_COURSE TABLE
        // =====================================================
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "personal_course" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid,
        "name" character varying NOT NULL,
        "color" character varying DEFAULT '#3B82F6',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        CONSTRAINT "PK_personal_course" PRIMARY KEY ("id")
      )
    `);

        await this.addForeignKeyIfNotExists(
            queryRunner,
            'personal_course',
            'FK_personal_course_user',
            'user_id',
            'user',
            'id'
        );

        // =====================================================
        // MATERIAL_CHUNK TABLE
        // =====================================================
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "material_chunk" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "material_id" uuid,
        "chunk_index" integer NOT NULL,
        "content" text NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        CONSTRAINT "PK_material_chunk" PRIMARY KEY ("id")
      )
    `);

        await this.addForeignKeyIfNotExists(
            queryRunner,
            'material_chunk',
            'FK_material_chunk_material',
            'material_id',
            'material',
            'id'
        );

        console.log('✓ All missing tables created successfully');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop tables in reverse order (respecting foreign key dependencies)
        const tables = [
            'material_chunk',
            'personal_course',
            'helpful_link',
            'public_note_vote',
            'public_note',
            'note',
            'material_rating',
            'material_favorite',
            'material_annotation',
            'partner_request',
            'user_badge',
            'comment',
        ];

        for (const table of tables) {
            await queryRunner.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
        }
    }

    private async addForeignKeyIfNotExists(
        queryRunner: QueryRunner,
        table: string,
        constraintName: string,
        column: string,
        refTable: string,
        refColumn: string,
    ): Promise<void> {
        try {
            const exists = await queryRunner.query(`
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = '${constraintName}' 
        AND table_name = '${table}'
      `);

            if (exists.length === 0) {
                await queryRunner.query(`
          ALTER TABLE "${table}" 
          ADD CONSTRAINT "${constraintName}" 
          FOREIGN KEY ("${column}") REFERENCES "${refTable}"("${refColumn}") 
          ON DELETE CASCADE ON UPDATE NO ACTION
        `);
                console.log(`✓ Added FK ${constraintName}`);
            }
        } catch (error) {
            console.log(`○ Skipped FK ${constraintName} (may already exist or table missing)`);
        }
    }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateScholarAppTables1747582000000 implements MigrationInterface {
  name = 'CreateScholarAppTables1747582000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add missing columns to user table
    await queryRunner.query(
      `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "password" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "department" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "yearOfStudy" integer`,
    );

    // Create material_category enum
    await queryRunner.query(
      `CREATE TYPE "public"."material_category_enum" AS ENUM('course_material', 'past_question', 'personal_note')`,
    );

    // Create material table
    await queryRunner.query(
      `CREATE TABLE "material" (
				"id" uuid NOT NULL DEFAULT uuid_generate_v4(),
				"title" character varying NOT NULL,
				"url" character varying NOT NULL,
				"type" character varying NOT NULL,
				"content" text NOT NULL,
				"department" character varying,
				"yearLevel" integer,
				"category" "public"."material_category_enum" NOT NULL DEFAULT 'course_material',
				"isPublic" boolean NOT NULL DEFAULT false,
				"uploadedById" uuid,
				"createdAt" TIMESTAMP NOT NULL DEFAULT now(),
				"updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
				"deletedAt" TIMESTAMP,
				CONSTRAINT "PK_material" PRIMARY KEY ("id")
			)`,
    );

    // Create conversation table
    await queryRunner.query(
      `CREATE TABLE "conversation" (
				"id" uuid NOT NULL DEFAULT uuid_generate_v4(),
				"title" character varying NOT NULL,
				"userId" uuid NOT NULL,
				"createdAt" TIMESTAMP NOT NULL DEFAULT now(),
				"updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
				"deletedAt" TIMESTAMP,
				CONSTRAINT "PK_conversation" PRIMARY KEY ("id")
			)`,
    );

    // Create message_role enum
    await queryRunner.query(
      `CREATE TYPE "public"."message_role_enum" AS ENUM('user', 'assistant')`,
    );

    // Create message table
    await queryRunner.query(
      `CREATE TABLE "message" (
				"id" uuid NOT NULL DEFAULT uuid_generate_v4(),
				"role" "public"."message_role_enum" NOT NULL,
				"content" text NOT NULL,
				"conversationId" uuid NOT NULL,
				"createdAt" TIMESTAMP NOT NULL DEFAULT now(),
				"updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
				"deletedAt" TIMESTAMP,
				CONSTRAINT "PK_message" PRIMARY KEY ("id")
			)`,
    );

    // Create study_session table
    await queryRunner.query(
      `CREATE TABLE "study_session" (
				"id" uuid NOT NULL DEFAULT uuid_generate_v4(),
				"userId" uuid NOT NULL,
				"startTime" TIMESTAMP NOT NULL,
				"endTime" TIMESTAMP,
				"duration" integer,
				"createdAt" TIMESTAMP NOT NULL DEFAULT now(),
				"updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
				"deletedAt" TIMESTAMP,
				CONSTRAINT "PK_study_session" PRIMARY KEY ("id")
			)`,
    );

    // Create study_streak table
    await queryRunner.query(
      `CREATE TABLE "study_streak" (
				"id" uuid NOT NULL DEFAULT uuid_generate_v4(),
				"userId" uuid NOT NULL,
				"currentStreak" integer NOT NULL DEFAULT 0,
				"longestStreak" integer NOT NULL DEFAULT 0,
				"lastStudyDate" TIMESTAMP,
				"createdAt" TIMESTAMP NOT NULL DEFAULT now(),
				"updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
				"deletedAt" TIMESTAMP,
				CONSTRAINT "PK_study_streak" PRIMARY KEY ("id"),
				CONSTRAINT "UQ_study_streak_user" UNIQUE ("userId")
			)`,
    );

    // Add foreign key constraints
    await queryRunner.query(
      `ALTER TABLE "material" ADD CONSTRAINT "FK_material_user" 
			FOREIGN KEY ("uploadedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "conversation" ADD CONSTRAINT "FK_conversation_user" 
			FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "message" ADD CONSTRAINT "FK_message_conversation" 
			FOREIGN KEY ("conversationId") REFERENCES "conversation"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "study_session" ADD CONSTRAINT "FK_study_session_user" 
			FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "study_streak" ADD CONSTRAINT "FK_study_streak_user" 
			FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    // Create indexes for better query performance
    await queryRunner.query(
      `CREATE INDEX "IDX_material_department_year" ON "material" ("department", "yearLevel")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_material_public" ON "material" ("isPublic")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_conversation_user" ON "conversation" ("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_message_conversation" ON "message" ("conversationId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_study_session_user" ON "study_session" ("userId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_study_session_user"`);
    await queryRunner.query(`DROP INDEX "IDX_message_conversation"`);
    await queryRunner.query(`DROP INDEX "IDX_conversation_user"`);
    await queryRunner.query(`DROP INDEX "IDX_material_public"`);
    await queryRunner.query(`DROP INDEX "IDX_material_department_year"`);

    // Drop foreign key constraints
    await queryRunner.query(
      `ALTER TABLE "study_streak" DROP CONSTRAINT "FK_study_streak_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "study_session" DROP CONSTRAINT "FK_study_session_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "message" DROP CONSTRAINT "FK_message_conversation"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation" DROP CONSTRAINT "FK_conversation_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "material" DROP CONSTRAINT "FK_material_user"`,
    );

    // Drop tables
    await queryRunner.query(`DROP TABLE "study_streak"`);
    await queryRunner.query(`DROP TABLE "study_session"`);
    await queryRunner.query(`DROP TABLE "message"`);
    await queryRunner.query(`DROP TYPE "public"."message_role_enum"`);
    await queryRunner.query(`DROP TABLE "conversation"`);
    await queryRunner.query(`DROP TABLE "material"`);
    await queryRunner.query(`DROP TYPE "public"."material_category_enum"`);

    // Remove added columns from user table
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN IF EXISTS "yearOfStudy"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN IF EXISTS "department"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN IF EXISTS "password"`,
    );
  }
}

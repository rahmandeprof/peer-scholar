import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to rename all columns from camelCase to snake_case
 * This migration renames columns in the production database to match
 * the new snake_case naming convention in entity files.
 * 
 * IMPORTANT: Run this migration BEFORE deploying the new entity code.
 */
export class SnakeCaseNamingConvention1702234000000 implements MigrationInterface {
    name = 'SnakeCaseNamingConvention1702234000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // =====================================================
        // BASE ENTITY COLUMNS (affects all tables)
        // =====================================================
        const tables = [
            'user', 'user_badge', 'study_streak', 'partner_request',
            'study_session', 'account', 'session', 'verification', 'otp',
            'comment', 'conversation', 'message', 'quiz_result',
            'school', 'faculty', 'department', 'course', 'material',
            'personal_course', 'material_chunk', 'material_favorite',
            'material_rating', 'material_annotation', 'material_report',
            'note', 'public_note', 'public_note_vote', 'helpful_link'
        ];

        // Rename timestamp columns for all tables (from base entity)
        for (const table of tables) {
            await this.safeRenameColumn(queryRunner, table, 'createdAt', 'created_at');
            await this.safeRenameColumn(queryRunner, table, 'updatedAt', 'updated_at');
            await this.safeRenameColumn(queryRunner, table, 'deletedAt', 'deleted_at');
        }

        // =====================================================
        // USER TABLE
        // =====================================================
        await this.safeRenameColumn(queryRunner, 'user', 'firstName', 'first_name');
        await this.safeRenameColumn(queryRunner, 'user', 'lastName', 'last_name');
        await this.safeRenameColumn(queryRunner, 'user', 'emailVerified', 'email_verified');
        await this.safeRenameColumn(queryRunner, 'user', 'banReason', 'ban_reason');
        await this.safeRenameColumn(queryRunner, 'user', 'banExpires', 'ban_expires');
        await this.safeRenameColumn(queryRunner, 'user', 'yearOfStudy', 'year_of_study');
        await this.safeRenameColumn(queryRunner, 'user', 'currentStreak', 'current_streak');
        await this.safeRenameColumn(queryRunner, 'user', 'longestStreak', 'longest_streak');
        await this.safeRenameColumn(queryRunner, 'user', 'lastStudyDate', 'last_study_date');
        await this.safeRenameColumn(queryRunner, 'user', 'googleId', 'google_id');
        await this.safeRenameColumn(queryRunner, 'user', 'lastReadMaterialId', 'last_read_material_id');
        await this.safeRenameColumn(queryRunner, 'user', 'lastReadPage', 'last_read_page');
        await this.safeRenameColumn(queryRunner, 'user', 'isVerified', 'is_verified');
        await this.safeRenameColumn(queryRunner, 'user', 'lastSeen', 'last_seen');
        await this.safeRenameColumn(queryRunner, 'user', 'lastProfileUpdate', 'last_profile_update');
        await this.safeRenameColumn(queryRunner, 'user', 'verificationToken', 'verification_token');
        await this.safeRenameColumn(queryRunner, 'user', 'resetPasswordToken', 'reset_password_token');
        await this.safeRenameColumn(queryRunner, 'user', 'resetPasswordExpires', 'reset_password_expires');
        await this.safeRenameColumn(queryRunner, 'user', 'studyDuration', 'study_duration');
        await this.safeRenameColumn(queryRunner, 'user', 'testDuration', 'test_duration');
        await this.safeRenameColumn(queryRunner, 'user', 'restDuration', 'rest_duration');

        // =====================================================
        // USER_BADGE TABLE
        // =====================================================
        await this.safeRenameColumn(queryRunner, 'user_badge', 'userId', 'user_id');
        await this.safeRenameColumn(queryRunner, 'user_badge', 'badgeType', 'badge_type');
        await this.safeRenameColumn(queryRunner, 'user_badge', 'unlockedAt', 'unlocked_at');

        // =====================================================
        // STUDY_STREAK TABLE
        // =====================================================
        await this.safeRenameColumn(queryRunner, 'study_streak', 'userId', 'user_id');
        await this.safeRenameColumn(queryRunner, 'study_streak', 'currentStreak', 'current_streak');
        await this.safeRenameColumn(queryRunner, 'study_streak', 'longestStreak', 'longest_streak');
        await this.safeRenameColumn(queryRunner, 'study_streak', 'lastActivityDate', 'last_activity_date');

        // =====================================================
        // PARTNER_REQUEST TABLE
        // =====================================================
        await this.safeRenameColumn(queryRunner, 'partner_request', 'senderId', 'sender_id');
        await this.safeRenameColumn(queryRunner, 'partner_request', 'receiverId', 'receiver_id');
        await this.safeRenameColumn(queryRunner, 'partner_request', 'lastNudgedAt', 'last_nudged_at');

        // =====================================================
        // STUDY_SESSION TABLE
        // =====================================================
        await this.safeRenameColumn(queryRunner, 'study_session', 'userId', 'user_id');
        await this.safeRenameColumn(queryRunner, 'study_session', 'durationSeconds', 'duration_seconds');
        await this.safeRenameColumn(queryRunner, 'study_session', 'startTime', 'start_time');
        await this.safeRenameColumn(queryRunner, 'study_session', 'endTime', 'end_time');

        // =====================================================
        // ACCOUNT TABLE
        // =====================================================
        await this.safeRenameColumn(queryRunner, 'account', 'userId', 'user_id');
        await this.safeRenameColumn(queryRunner, 'account', 'accountId', 'account_id');
        await this.safeRenameColumn(queryRunner, 'account', 'providerId', 'provider_id');
        await this.safeRenameColumn(queryRunner, 'account', 'accessToken', 'access_token');
        await this.safeRenameColumn(queryRunner, 'account', 'refreshToken', 'refresh_token');
        await this.safeRenameColumn(queryRunner, 'account', 'accessTokenExpiresAt', 'access_token_expires_at');
        await this.safeRenameColumn(queryRunner, 'account', 'refreshTokenExpiresAt', 'refresh_token_expires_at');
        await this.safeRenameColumn(queryRunner, 'account', 'idToken', 'id_token');

        // =====================================================
        // SESSION TABLE
        // =====================================================
        await this.safeRenameColumn(queryRunner, 'session', 'userId', 'user_id');
        await this.safeRenameColumn(queryRunner, 'session', 'expiresAt', 'expires_at');
        await this.safeRenameColumn(queryRunner, 'session', 'ipAddress', 'ip_address');
        await this.safeRenameColumn(queryRunner, 'session', 'userAgent', 'user_agent');
        await this.safeRenameColumn(queryRunner, 'session', 'impersonatedBy', 'impersonated_by');

        // =====================================================
        // VERIFICATION TABLE
        // =====================================================
        await this.safeRenameColumn(queryRunner, 'verification', 'expiresAt', 'expires_at');

        // =====================================================
        // CONVERSATION TABLE
        // =====================================================
        await this.safeRenameColumn(queryRunner, 'conversation', 'userId', 'user_id');

        // =====================================================
        // MESSAGE TABLE
        // =====================================================
        await this.safeRenameColumn(queryRunner, 'message', 'conversationId', 'conversation_id');

        // =====================================================
        // COMMENT TABLE
        // =====================================================
        await this.safeRenameColumn(queryRunner, 'comment', 'userId', 'user_id');
        await this.safeRenameColumn(queryRunner, 'comment', 'materialId', 'material_id');

        // =====================================================
        // QUIZ_RESULT TABLE
        // =====================================================
        await this.safeRenameColumn(queryRunner, 'quiz_result', 'totalQuestions', 'total_questions');
        await this.safeRenameColumn(queryRunner, 'quiz_result', 'userId', 'user_id');
        await this.safeRenameColumn(queryRunner, 'quiz_result', 'materialId', 'material_id');

        // =====================================================
        // FACULTY TABLE
        // =====================================================
        await this.safeRenameColumn(queryRunner, 'faculty', 'schoolId', 'school_id');

        // =====================================================
        // DEPARTMENT TABLE
        // =====================================================
        await this.safeRenameColumn(queryRunner, 'department', 'facultyId', 'faculty_id');

        // =====================================================
        // COURSE TABLE
        // =====================================================
        await this.safeRenameColumn(queryRunner, 'course', 'departmentId', 'department_id');

        // =====================================================
        // MATERIAL TABLE
        // =====================================================
        await this.safeRenameColumn(queryRunner, 'material', 'fileUrl', 'file_url');
        await this.safeRenameColumn(queryRunner, 'material', 'pdfUrl', 'pdf_url');
        await this.safeRenameColumn(queryRunner, 'material', 'fileType', 'file_type');
        await this.safeRenameColumn(queryRunner, 'material', 'courseId', 'course_id');
        await this.safeRenameColumn(queryRunner, 'material', 'uploaderId', 'uploader_id');
        await this.safeRenameColumn(queryRunner, 'material', 'targetFaculty', 'target_faculty');
        await this.safeRenameColumn(queryRunner, 'material', 'targetDepartment', 'target_department');
        await this.safeRenameColumn(queryRunner, 'material', 'courseCode', 'course_code');
        await this.safeRenameColumn(queryRunner, 'material', 'targetYear', 'target_year');
        await this.safeRenameColumn(queryRunner, 'material', 'averageRating', 'average_rating');
        await this.safeRenameColumn(queryRunner, 'material', 'favoritesCount', 'favorites_count');
        await this.safeRenameColumn(queryRunner, 'material', 'fileHash', 'file_hash');
        await this.safeRenameColumn(queryRunner, 'material', 'parentId', 'parent_id');
        await this.safeRenameColumn(queryRunner, 'material', 'keyPoints', 'key_points');

        // =====================================================
        // PERSONAL_COURSE TABLE
        // =====================================================
        await this.safeRenameColumn(queryRunner, 'personal_course', 'userId', 'user_id');

        // =====================================================
        // MATERIAL_CHUNK TABLE
        // =====================================================
        await this.safeRenameColumn(queryRunner, 'material_chunk', 'materialId', 'material_id');
        await this.safeRenameColumn(queryRunner, 'material_chunk', 'chunkIndex', 'chunk_index');

        // =====================================================
        // MATERIAL_FAVORITE TABLE
        // =====================================================
        await this.safeRenameColumn(queryRunner, 'material_favorite', 'userId', 'user_id');
        await this.safeRenameColumn(queryRunner, 'material_favorite', 'materialId', 'material_id');

        // =====================================================
        // MATERIAL_RATING TABLE
        // =====================================================
        await this.safeRenameColumn(queryRunner, 'material_rating', 'userId', 'user_id');
        await this.safeRenameColumn(queryRunner, 'material_rating', 'materialId', 'material_id');

        // =====================================================
        // MATERIAL_ANNOTATION TABLE
        // =====================================================
        await this.safeRenameColumn(queryRunner, 'material_annotation', 'materialId', 'material_id');
        await this.safeRenameColumn(queryRunner, 'material_annotation', 'userId', 'user_id');
        await this.safeRenameColumn(queryRunner, 'material_annotation', 'selectedText', 'selected_text');
        await this.safeRenameColumn(queryRunner, 'material_annotation', 'pageNumber', 'page_number');
        await this.safeRenameColumn(queryRunner, 'material_annotation', 'contextBefore', 'context_before');
        await this.safeRenameColumn(queryRunner, 'material_annotation', 'contextAfter', 'context_after');

        // =====================================================
        // MATERIAL_REPORT TABLE
        // =====================================================
        await this.safeRenameColumn(queryRunner, 'material_report', 'materialId', 'material_id');
        await this.safeRenameColumn(queryRunner, 'material_report', 'reporterId', 'reporter_id');

        // =====================================================
        // NOTE TABLE
        // =====================================================
        await this.safeRenameColumn(queryRunner, 'note', 'userId', 'user_id');
        await this.safeRenameColumn(queryRunner, 'note', 'materialId', 'material_id');

        // =====================================================
        // PUBLIC_NOTE TABLE
        // =====================================================
        await this.safeRenameColumn(queryRunner, 'public_note', 'materialId', 'material_id');
        await this.safeRenameColumn(queryRunner, 'public_note', 'userId', 'user_id');
        await this.safeRenameColumn(queryRunner, 'public_note', 'selectedText', 'selected_text');
        await this.safeRenameColumn(queryRunner, 'public_note', 'pageNumber', 'page_number');
        await this.safeRenameColumn(queryRunner, 'public_note', 'contextBefore', 'context_before');
        await this.safeRenameColumn(queryRunner, 'public_note', 'contextAfter', 'context_after');

        // =====================================================
        // PUBLIC_NOTE_VOTE TABLE
        // =====================================================
        await this.safeRenameColumn(queryRunner, 'public_note_vote', 'noteId', 'note_id');
        await this.safeRenameColumn(queryRunner, 'public_note_vote', 'userId', 'user_id');

        // =====================================================
        // HELPFUL_LINK TABLE
        // =====================================================
        await this.safeRenameColumn(queryRunner, 'helpful_link', 'linkType', 'link_type');
        await this.safeRenameColumn(queryRunner, 'helpful_link', 'thumbnailUrl', 'thumbnail_url');
        await this.safeRenameColumn(queryRunner, 'helpful_link', 'materialId', 'material_id');
        await this.safeRenameColumn(queryRunner, 'helpful_link', 'addedById', 'added_by_id');
        await this.safeRenameColumn(queryRunner, 'helpful_link', 'helpfulCount', 'helpful_count');

        // =====================================================
        // OTP TABLE
        // =====================================================
        await this.safeRenameColumn(queryRunner, 'otp', 'userId', 'user_id');

        // =====================================================
        // RENAME JOIN TABLES
        // =====================================================
        // Personal course materials join table
        await this.safeRenameTable(queryRunner, 'personal_course_materials_material', 'personal_course_materials');
        await this.safeRenameColumn(queryRunner, 'personal_course_materials', 'personalCourseId', 'personal_course_id');
        await this.safeRenameColumn(queryRunner, 'personal_course_materials', 'materialId', 'material_id');

        // Material contributors join table
        await this.safeRenameTable(queryRunner, 'material_contributors_user', 'material_contributors');
        await this.safeRenameColumn(queryRunner, 'material_contributors', 'materialId', 'material_id');
        await this.safeRenameColumn(queryRunner, 'material_contributors', 'userId', 'user_id');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Reverse all the renames (snake_case back to camelCase)
        // This is a comprehensive rollback - implement if needed
        console.log('Rollback not implemented - manual intervention required');
    }

    /**
     * Safely rename a column - checks if old column exists and new column doesn't
     */
    private async safeRenameColumn(
        queryRunner: QueryRunner,
        table: string,
        oldName: string,
        newName: string
    ): Promise<void> {
        try {
            // Check if old column exists
            const columns = await queryRunner.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = '${table}' 
                AND column_name = '${oldName}'
            `);

            if (columns.length > 0) {
                await queryRunner.query(
                    `ALTER TABLE "${table}" RENAME COLUMN "${oldName}" TO "${newName}"`
                );
                console.log(`✓ Renamed ${table}.${oldName} → ${newName}`);
            } else {
                console.log(`○ Skipped ${table}.${oldName} (column not found, may already be renamed)`);
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            console.log(`✗ Failed to rename ${table}.${oldName}: ${message}`);
        }
    }

    /**
     * Safely rename a table - checks if old table exists
     */
    private async safeRenameTable(
        queryRunner: QueryRunner,
        oldName: string,
        newName: string
    ): Promise<void> {
        try {
            const tables = await queryRunner.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_name = '${oldName}'
            `);

            if (tables.length > 0) {
                await queryRunner.query(
                    `ALTER TABLE "${oldName}" RENAME TO "${newName}"`
                );
                console.log(`✓ Renamed table ${oldName} → ${newName}`);
            } else {
                console.log(`○ Skipped table ${oldName} (not found, may already be renamed)`);
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            console.log(`✗ Failed to rename table ${oldName}: ${message}`);
        }
    }
}

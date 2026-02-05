/*
 * BACKFILL FACULTY AND DEPARTMENT IDs
 * Run this in Supabase SQL Editor AFTER the migration adds the columns
 * 
 * This script matches users' legacy string faculty/department names
 * to the actual Faculty and Department entity IDs
 */

-- Step 1: Backfill faculty_id by matching faculty name (case-insensitive)
UPDATE "user" u
SET "faculty_id" = f.id
FROM "faculty" f
WHERE LOWER(TRIM(u.faculty)) = LOWER(TRIM(f.name))
  AND u.faculty_id IS NULL
  AND u.school_id = f.school_id;

-- Step 2: Backfill department_id by matching department name within the faculty
UPDATE "user" u
SET "department_id" = d.id
FROM "department" d
JOIN "faculty" f ON d.faculty_id = f.id
WHERE LOWER(TRIM(u.department)) = LOWER(TRIM(d.name))
  AND u.department_id IS NULL
  AND u.faculty_id = f.id;

-- Step 3: Verification - show how many users were linked
SELECT 
  COUNT(*) FILTER (WHERE faculty_id IS NOT NULL) as users_with_faculty_id,
  COUNT(*) FILTER (WHERE department_id IS NOT NULL) as users_with_department_id,
  COUNT(*) FILTER (WHERE faculty_id IS NULL AND faculty IS NOT NULL) as unlinked_faculty,
  COUNT(*) FILTER (WHERE department_id IS NULL AND department IS NOT NULL) as unlinked_department,
  COUNT(*) as total_users
FROM "user";

-- Step 4: Show unlinked faculty names (for debugging)
SELECT DISTINCT 
  u.faculty as unlinked_faculty_name,
  u.school,
  COUNT(*) as user_count
FROM "user" u
WHERE u.faculty_id IS NULL AND u.faculty IS NOT NULL
GROUP BY u.faculty, u.school
ORDER BY user_count DESC;

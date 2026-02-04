/*
 * FORCE ASSIGN REMAINING UNLINKED USERS TO UNILORIN
 * Run this only if you are sure the ~89 unlinked users belong to University of Ilorin
 */

-- 1. Assign all users with NULL school_id to University of Ilorin
UPDATE "user"
SET "school_id" = (SELECT id FROM "school" WHERE name = 'University of Ilorin')
WHERE "school_id" IS NULL;

-- 2. Update their legacy string fields just in case
UPDATE "user"
SET 
  "school" = 'University of Ilorin'
WHERE "school_id" = (SELECT id FROM "school" WHERE name = 'University of Ilorin')
  AND "school" IS NULL;

-- 3. Link Materials for these users
UPDATE "material"
SET "school_id" = "user"."school_id"
FROM "user"
WHERE "material"."uploader_id" = "user"."id"
  AND "material"."school_id" IS NULL
  AND "user"."school_id" IS NOT NULL;

-- 4. Final Verification
SELECT 
    s.name as school_name, 
    COUNT(DISTINCT u.id) as user_count, 
    COUNT(DISTINCT m.id) as material_count
FROM "school" s
LEFT JOIN "user" u ON u.school_id = s.id
LEFT JOIN "material" m ON m.school_id = s.id
GROUP BY s.id, s.name;

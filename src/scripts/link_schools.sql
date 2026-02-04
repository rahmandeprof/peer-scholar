/*
 * LINK LEGACY DATA TO SCHOOL ENTITIES
 * Run this in Supabase SQL Editor to fix "0 users/materials" in Admin Dashboard
 */

-- 1. Link Users to "University of Ilorin" (matches 'Unilorin', 'University of Ilorin')
UPDATE "user"
SET "school_id" = (SELECT id FROM "school" WHERE name = 'University of Ilorin')
WHERE "school_id" IS NULL 
  AND ("school" ILIKE '%ilorin%' OR "school" ILIKE '%unilorin%');

-- 2. Link Users to "Usmanu Danfodiyo University" (matches 'UDUS', 'Danfodiyo')
UPDATE "user"
SET "school_id" = (SELECT id FROM "school" WHERE name = 'Usmanu Danfodiyo University')
WHERE "school_id" IS NULL 
  AND ("school" ILIKE '%danfodiyo%' OR "school" ILIKE '%udus%');

-- 3. Generic Exact Match (matches 'Crescent University', etc.)
UPDATE "user"
SET "school_id" = "school"."id"
FROM "school"
WHERE LOWER("user"."school") = LOWER("school"."name")
  AND "user"."school_id" IS NULL;

-- 4. Link Materials to Schools (inherit from Uploader)
UPDATE "material"
SET "school_id" = "user"."school_id"
FROM "user"
WHERE "material"."uploader_id" = "user"."id"
  AND "material"."school_id" IS NULL
  AND "user"."school_id" IS NOT NULL;

-- 5. Verification Results
SELECT 
    s.name as school_name, 
    COUNT(DISTINCT u.id) as user_count, 
    COUNT(DISTINCT m.id) as material_count
FROM "school" s
LEFT JOIN "user" u ON u.school_id = s.id
LEFT JOIN "material" m ON m.school_id = s.id
GROUP BY s.id, s.name;

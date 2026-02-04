/*
 * DEBUGGING MISSING LINKS
 * Run this to see what school names the unlinked users have.
 */

SELECT 
    school as raw_school_name, 
    COUNT(*) as user_count 
FROM "user" 
WHERE school_id IS NULL 
GROUP BY school
ORDER BY user_count DESC;

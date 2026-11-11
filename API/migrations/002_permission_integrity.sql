-- Normalize permission relations without dropping valid grants.
-- Apply with: mysql < API/migrations/002_permission_integrity.sql
-- Requires the existing permissions, user_permissions and role_permissions tables.

-- Merge duplicate individual grants for the same permission row, then remove extras.
UPDATE user_permissions keep_row
JOIN (
    SELECT user_id, permission_id, MIN(id) AS keep_id,
           MAX(can_read) AS merged_read, MAX(can_write) AS merged_write
    FROM user_permissions
    GROUP BY user_id, permission_id
    HAVING COUNT(*) > 1
) duplicates ON duplicates.keep_id = keep_row.id
SET keep_row.can_read = duplicates.merged_read,
    keep_row.can_write = duplicates.merged_write;

DELETE extra_row
FROM user_permissions extra_row
JOIN (
    SELECT user_id, permission_id, MIN(id) AS keep_id
    FROM user_permissions
    GROUP BY user_id, permission_id
    HAVING COUNT(*) > 1
) duplicates
  ON duplicates.user_id = extra_row.user_id
 AND duplicates.permission_id = extra_row.permission_id
WHERE extra_row.id <> duplicates.keep_id;

-- Role grants are boolean relations; duplicate links carry no extra information.
DELETE extra_row
FROM role_permissions extra_row
JOIN (
    SELECT role_id, permission_id, MIN(id) AS keep_id
    FROM role_permissions
    GROUP BY role_id, permission_id
    HAVING COUNT(*) > 1
) duplicates
  ON duplicates.role_id = extra_row.role_id
 AND duplicates.permission_id = extra_row.permission_id
WHERE extra_row.id <> duplicates.keep_id;

-- Add relation uniqueness only if the equivalent index does not already exist.
SET @schema_name = DATABASE();

SET @index_exists = (
    SELECT COUNT(*) FROM information_schema.statistics
    WHERE table_schema = @schema_name AND table_name = 'user_permissions'
      AND index_name = 'uq_user_permissions_user_permission'
);
SET @ddl = IF(@index_exists = 0,
    'ALTER TABLE user_permissions ADD UNIQUE KEY uq_user_permissions_user_permission (user_id, permission_id)',
    'SELECT 1');
PREPARE permission_stmt FROM @ddl;
EXECUTE permission_stmt;
DEALLOCATE PREPARE permission_stmt;

SET @index_exists = (
    SELECT COUNT(*) FROM information_schema.statistics
    WHERE table_schema = @schema_name AND table_name = 'role_permissions'
      AND index_name = 'uq_role_permissions_role_permission'
);
SET @ddl = IF(@index_exists = 0,
    'ALTER TABLE role_permissions ADD UNIQUE KEY uq_role_permissions_role_permission (role_id, permission_id)',
    'SELECT 1');
PREPARE permission_stmt FROM @ddl;
EXECUTE permission_stmt;
DEALLOCATE PREPARE permission_stmt;

-- Consolidate duplicate permission codes while preserving the union of grants.
DROP TEMPORARY TABLE IF EXISTS permission_code_canonical;
CREATE TEMPORARY TABLE permission_code_canonical AS
SELECT code, MIN(id) AS canonical_id
FROM permissions
GROUP BY code;

INSERT INTO user_permissions (user_id, permission_id, can_read, can_write)
SELECT up.user_id, canonical.canonical_id,
       MAX(up.can_read), MAX(up.can_write)
FROM user_permissions up
JOIN permissions p ON p.id = up.permission_id
JOIN permission_code_canonical canonical ON canonical.code = p.code
GROUP BY up.user_id, canonical.canonical_id
ON DUPLICATE KEY UPDATE
    can_read = GREATEST(user_permissions.can_read, VALUES(can_read)),
    can_write = GREATEST(user_permissions.can_write, VALUES(can_write));

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT DISTINCT rp.role_id, canonical.canonical_id
FROM role_permissions rp
JOIN permissions p ON p.id = rp.permission_id
JOIN permission_code_canonical canonical ON canonical.code = p.code;

DELETE up
FROM user_permissions up
JOIN permissions p ON p.id = up.permission_id
JOIN permission_code_canonical canonical ON canonical.code = p.code
WHERE p.id <> canonical.canonical_id;

DELETE rp
FROM role_permissions rp
JOIN permissions p ON p.id = rp.permission_id
JOIN permission_code_canonical canonical ON canonical.code = p.code
WHERE p.id <> canonical.canonical_id;

DELETE p
FROM permissions p
JOIN permission_code_canonical canonical ON canonical.code = p.code
WHERE p.id <> canonical.canonical_id;

DROP TEMPORARY TABLE IF EXISTS permission_code_canonical;

SET @index_exists = (
    SELECT COUNT(*) FROM information_schema.statistics
    WHERE table_schema = @schema_name AND table_name = 'permissions'
      AND index_name = 'uq_permissions_code'
);
SET @ddl = IF(@index_exists = 0,
    'ALTER TABLE permissions ADD UNIQUE KEY uq_permissions_code (code)',
    'SELECT 1');
PREPARE permission_stmt FROM @ddl;
EXECUTE permission_stmt;
DEALLOCATE PREPARE permission_stmt;

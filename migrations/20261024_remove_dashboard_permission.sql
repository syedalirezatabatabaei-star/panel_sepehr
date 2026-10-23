-- Remove the retired dashboard permission and all grants/overrides for it.
-- Safe to rerun; unrelated permissions and user data are preserved.
DELETE up
FROM user_permissions AS up
INNER JOIN permissions AS p ON p.id = up.permission_id
WHERE p.code IN ('dashboard', 'dashboard.view');

DELETE rp
FROM role_permissions AS rp
INNER JOIN permissions AS p ON p.id = rp.permission_id
WHERE p.code IN ('dashboard', 'dashboard.view');

DELETE FROM permissions
WHERE code IN ('dashboard', 'dashboard.view');

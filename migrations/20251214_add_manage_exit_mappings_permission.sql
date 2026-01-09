-- Add 'manage_exit_mappings' permission and grant it to the admin role
-- Safe inserts to avoid duplicates

INSERT INTO permissions (name)
SELECT 'manage_exit_mappings'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name='manage_exit_mappings');

-- Grant to admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin' AND p.name = 'manage_exit_mappings'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    JOIN roles r2 ON rp.role_id = r2.id
    JOIN permissions p2 ON rp.permission_id = p2.id
    WHERE r2.name = 'admin' AND p2.name = 'manage_exit_mappings'
  );

-- Optionally grant to other roles here by inserting additional rows

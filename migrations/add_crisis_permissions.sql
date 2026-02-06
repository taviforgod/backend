-- Add crisis management permissions
-- These permissions are required for the crisis followup functionality

INSERT INTO permissions (name) VALUES 
('crisis_view'),
('crisis_manage'),
('crisis_assign')
ON CONFLICT (name) DO NOTHING;

-- Assign crisis permissions to admin role (assuming admin role exists)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin' 
AND p.name IN ('crisis_view', 'crisis_manage', 'crisis_assign')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign crisis permissions to pastor role (if it exists)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'pastor' 
AND p.name IN ('crisis_view', 'crisis_manage', 'crisis_assign')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign view and assign permissions to cell leader role (if it exists)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'cell_leader' 
AND p.name IN ('crisis_view', 'crisis_assign')
ON CONFLICT (role_id, permission_id) DO NOTHING;

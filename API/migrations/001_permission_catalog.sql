-- Permission catalog used by the Settings > Permissions page.
-- Run against the bale_sender database before using the permission editor.
INSERT INTO permissions (code) VALUES
('bale.personal_message'),
('eitaa.personal_message'),
('rubika.personal_message'),
('bale.chats'),
('eitaa.chats'),
('dashboard'),
('users'),
('registration_requests'),
('roles'),
('notifications'),
('audit_logs'),
('activities'),
('security'),
('settings')
ON DUPLICATE KEY UPDATE code = VALUES(code);

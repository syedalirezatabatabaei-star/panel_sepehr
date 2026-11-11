-- Idempotent migration for panel announcements and system settings.
-- Run with a database administrator account during deployment.
-- Does not drop, truncate, or alter existing tables/data.

CREATE TABLE IF NOT EXISTS panel_announcements (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    visibility ENUM('public','private') NOT NULL DEFAULT 'public',
    recipient_user_id BIGINT NULL,
    created_by BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    INDEX idx_panel_announcements_visibility (visibility, is_active, created_at),
    INDEX idx_panel_announcements_recipient (recipient_user_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS panel_system_settings (
    setting_key VARCHAR(120) NOT NULL PRIMARY KEY,
    setting_value LONGTEXT NULL,
    updated_by BIGINT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- Persistent developer audit events (page visits, API requests, permission denials).
CREATE TABLE IF NOT EXISTS panel_system_logs (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NULL,
    username VARCHAR(150) NULL,
    event_type VARCHAR(80) NOT NULL,
    description VARCHAR(2000) NOT NULL,
    request_path VARCHAR(500) NULL,
    request_method VARCHAR(12) NULL,
    status_code SMALLINT NULL,
    ip_address VARCHAR(64) NULL,
    user_agent VARCHAR(500) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_panel_system_logs_created (created_at, id),
    INDEX idx_panel_system_logs_user (username, created_at),
    INDEX idx_panel_system_logs_status (status_code, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- Granular role permission flags. Existing role grants retain their previous
-- all-or-nothing meaning because new columns default to enabled.
SET @schema_name = DATABASE();
SET @column_exists = (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema=@schema_name AND table_name='role_permissions' AND column_name='can_read'
);
SET @ddl = IF(@column_exists = 0,
    'ALTER TABLE role_permissions ADD COLUMN can_read TINYINT(1) NOT NULL DEFAULT 1',
    'SELECT 1');
PREPARE security_stmt FROM @ddl;
EXECUTE security_stmt;
DEALLOCATE PREPARE security_stmt;

SET @column_exists = (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema=@schema_name AND table_name='role_permissions' AND column_name='can_write'
);
SET @ddl = IF(@column_exists = 0,
    'ALTER TABLE role_permissions ADD COLUMN can_write TINYINT(1) NOT NULL DEFAULT 1',
    'SELECT 1');
PREPARE security_stmt FROM @ddl;
EXECUTE security_stmt;
DEALLOCATE PREPARE security_stmt;

CREATE TABLE IF NOT EXISTS auth_rate_limits (
    bucket_key CHAR(64) NOT NULL PRIMARY KEY,
    window_started_at DATETIME NOT NULL,
    attempts INT UNSIGNED NOT NULL DEFAULT 0,
    blocked_until DATETIME NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_auth_rate_limits_blocked (blocked_until),
    INDEX idx_auth_rate_limits_updated (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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

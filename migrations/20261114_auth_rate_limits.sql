-- Required by password login throttling.
-- Idempotent: safe to run on existing deployments; preserves all existing data.
-- Run against the application's configured database (bale_sender).

CREATE TABLE IF NOT EXISTS auth_rate_limits (
    bucket_key CHAR(64) NOT NULL PRIMARY KEY,
    window_started_at DATETIME NOT NULL,
    attempts INT UNSIGNED NOT NULL DEFAULT 0,
    blocked_until DATETIME NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_auth_rate_limits_blocked (blocked_until),
    INDEX idx_auth_rate_limits_updated (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

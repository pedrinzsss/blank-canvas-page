ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'page_view';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'signup';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'signup_failed';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'login_failed';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'password_reset_request';
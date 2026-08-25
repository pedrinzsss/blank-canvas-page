ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'bank_account_create';
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'bank_account_delete';
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'bank_account_update';
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'withdrawal_request';
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'product_create';
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'product_update';
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'product_delete';
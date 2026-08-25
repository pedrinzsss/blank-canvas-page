
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'offer_create';
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'offer_update';
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'offer_publish';
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'offer_deactivate';
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'offer_delete';
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'checkout_update';
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'tracking_update';
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'order_bump_update';
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'upsell_update';

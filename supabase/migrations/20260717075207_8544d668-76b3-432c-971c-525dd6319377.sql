
ALTER TABLE public.order_bumps
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS display_rule text NOT NULL DEFAULT 'always',
  ADD COLUMN IF NOT EXISTS min_total_cents integer,
  ADD COLUMN IF NOT EXISTS payment_methods text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS position integer NOT NULL DEFAULT 0;

ALTER TABLE public.order_bumps
  DROP CONSTRAINT IF EXISTS order_bumps_display_rule_check;
ALTER TABLE public.order_bumps
  ADD CONSTRAINT order_bumps_display_rule_check
  CHECK (display_rule IN ('always','min_total','payment_method'));

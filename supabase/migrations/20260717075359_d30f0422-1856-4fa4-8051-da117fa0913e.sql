
ALTER TABLE public.upsells
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'upsell',
  ADD COLUMN IF NOT EXISTS trigger text NOT NULL DEFAULT 'always',
  ADD COLUMN IF NOT EXISTS priority integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS custom_price_cents integer,
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS description text;

ALTER TABLE public.upsells DROP CONSTRAINT IF EXISTS upsells_kind_check;
ALTER TABLE public.upsells ADD CONSTRAINT upsells_kind_check
  CHECK (kind IN ('upsell','downsell'));

ALTER TABLE public.upsells DROP CONSTRAINT IF EXISTS upsells_trigger_check;
ALTER TABLE public.upsells ADD CONSTRAINT upsells_trigger_check
  CHECK (trigger IN ('always','on_accept','on_decline'));

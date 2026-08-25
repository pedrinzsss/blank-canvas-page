
ALTER TABLE public.charges
  ADD COLUMN IF NOT EXISTS acquirer text,
  ADD COLUMN IF NOT EXISTS acquirer_ref text,
  ADD COLUMN IF NOT EXISTS pix_qrcode text,
  ADD COLUMN IF NOT EXISTS pix_expiration_at timestamptz,
  ADD COLUMN IF NOT EXISTS secure_url text;

CREATE INDEX IF NOT EXISTS charges_acquirer_ref_idx ON public.charges (acquirer, acquirer_ref);

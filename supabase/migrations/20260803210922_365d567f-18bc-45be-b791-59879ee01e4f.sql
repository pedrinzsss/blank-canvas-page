CREATE TABLE public.manual_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  amount_cents integer NOT NULL,
  description text,
  customer_email text,
  customer_name text,
  acquirer text NOT NULL DEFAULT 'medusa',
  acquirer_ref text,
  external_ref text NOT NULL,
  pix_qrcode text,
  secure_url text,
  status text NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_manual_charges_user ON public.manual_charges(user_id);
CREATE INDEX idx_manual_charges_ref ON public.manual_charges(external_ref);
CREATE INDEX idx_manual_charges_acq_ref ON public.manual_charges(acquirer_ref);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.manual_charges TO authenticated;
GRANT ALL ON public.manual_charges TO service_role;

ALTER TABLE public.manual_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own manual charges"
ON public.manual_charges FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_manual_charges_updated_at
BEFORE UPDATE ON public.manual_charges
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS invoice_name TEXT,
  ADD COLUMN IF NOT EXISTS support_email TEXT,
  ADD COLUMN IF NOT EXISTS support_whatsapp TEXT;

ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'BRL',
  ADD COLUMN IF NOT EXISTS checkout_language TEXT NOT NULL DEFAULT 'pt-BR',
  ADD COLUMN IF NOT EXISTS offer_type TEXT NOT NULL DEFAULT 'nacional';

CREATE OR REPLACE FUNCTION public.gen_offer_code() RETURNS TEXT
LANGUAGE plpgsql AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..7 LOOP
    result := result || substr(chars, 1 + floor(random() * length(chars))::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS offer_code TEXT UNIQUE DEFAULT public.gen_offer_code();

UPDATE public.offers SET offer_code = public.gen_offer_code() WHERE offer_code IS NULL;

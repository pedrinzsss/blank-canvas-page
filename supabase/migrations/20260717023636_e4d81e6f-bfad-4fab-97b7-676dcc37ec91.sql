ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS invoice_name text,
  ADD COLUMN IF NOT EXISTS sales_page_url text,
  ADD COLUMN IF NOT EXISTS support_email text,
  ADD COLUMN IF NOT EXISTS support_whatsapp text;
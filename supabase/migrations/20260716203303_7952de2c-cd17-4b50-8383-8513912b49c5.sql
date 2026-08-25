-- Enum for KYC status
DO $$ BEGIN
  CREATE TYPE public.kyc_status AS ENUM ('pending','submitted','approved','rejected','changes_requested');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.kyc_person_type AS ENUM ('pf','pj');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Main submission table
CREATE TABLE public.kyc_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  person_type public.kyc_person_type NOT NULL,
  status public.kyc_status NOT NULL DEFAULT 'pending',

  -- Common / contact
  document text,               -- CPF or CNPJ
  email text,
  phone text,
  website text,
  avg_ticket_cents integer,
  products_description text,

  -- PF fields (also used for PJ representative)
  full_name text,
  birth_date date,
  mother_name text,
  monthly_income_cents integer,
  occupation text,

  -- Address
  address_street text,
  address_number text,
  address_complement text,
  address_neighborhood text,
  address_city text,
  address_state text,
  address_zip text,

  -- PJ specific
  company_name text,
  trade_name text,

  -- Review
  admin_notes text,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id),
  submitted_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.kyc_submissions TO authenticated;
GRANT ALL ON public.kyc_submissions TO service_role;
ALTER TABLE public.kyc_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kyc_submissions_owner_select" ON public.kyc_submissions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "kyc_submissions_owner_insert" ON public.kyc_submissions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "kyc_submissions_owner_update" ON public.kyc_submissions
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER kyc_submissions_updated_at
  BEFORE UPDATE ON public.kyc_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Documents
CREATE TABLE public.kyc_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.kyc_submissions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doc_type text NOT NULL,      -- 'id_front','id_back','selfie','address_proof','social_contract','partner_id_front','partner_id_back','partner_selfie'
  storage_path text NOT NULL,
  file_name text,
  mime_type text,
  size_bytes integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.kyc_documents TO authenticated;
GRANT ALL ON public.kyc_documents TO service_role;
ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kyc_documents_owner_select" ON public.kyc_documents
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "kyc_documents_owner_insert" ON public.kyc_documents
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "kyc_documents_owner_delete" ON public.kyc_documents
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX kyc_documents_submission_idx ON public.kyc_documents(submission_id);

-- Bank accounts
CREATE TABLE public.kyc_bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.kyc_submissions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_name text NOT NULL,
  account_type text NOT NULL,  -- 'corrente' | 'poupanca'
  holder_name text NOT NULL,
  holder_document text NOT NULL,
  agency text NOT NULL,
  account_number text NOT NULL,
  pix_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.kyc_bank_accounts TO authenticated;
GRANT ALL ON public.kyc_bank_accounts TO service_role;
ALTER TABLE public.kyc_bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kyc_bank_accounts_owner_select" ON public.kyc_bank_accounts
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "kyc_bank_accounts_owner_insert" ON public.kyc_bank_accounts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "kyc_bank_accounts_owner_update" ON public.kyc_bank_accounts
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "kyc_bank_accounts_owner_delete" ON public.kyc_bank_accounts
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER kyc_bank_accounts_updated_at
  BEFORE UPDATE ON public.kyc_bank_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage policies on the 'kyc-documents' bucket (bucket created via tool).
-- Files are stored under: <user_id>/<submission_id>/<doc_type>-<timestamp>.<ext>
-- so the first path segment is the owner's user_id.

CREATE POLICY "kyc_docs_owner_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'kyc-documents'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.has_role(auth.uid(), 'admin')
    )
  );

CREATE POLICY "kyc_docs_owner_write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'kyc-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "kyc_docs_owner_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'kyc-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
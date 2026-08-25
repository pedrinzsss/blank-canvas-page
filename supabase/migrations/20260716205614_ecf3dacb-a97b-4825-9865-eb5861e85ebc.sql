ALTER TABLE public.kyc_bank_accounts ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','blocked'));

-- Allow admins to update bank account status
DROP POLICY IF EXISTS "Admins can update bank accounts" ON public.kyc_bank_accounts;
CREATE POLICY "Admins can update bank accounts"
ON public.kyc_bank_accounts
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can view all bank accounts" ON public.kyc_bank_accounts;
CREATE POLICY "Admins can view all bank accounts"
ON public.kyc_bank_accounts
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR auth.uid() = user_id);
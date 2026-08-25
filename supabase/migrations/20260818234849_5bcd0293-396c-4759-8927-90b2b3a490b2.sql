CREATE TABLE public.manual_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type text NOT NULL CHECK (type IN ('income', 'outcome')),
    amount_cents integer NOT NULL,
    description text NOT NULL,
    category text NOT NULL,
    payment_method text NOT NULL,
    received boolean NOT NULL DEFAULT false,
    date timestamptz NOT NULL DEFAULT now(),
    account_id uuid, -- Reserved for future multiple accounts support
    attachment_url text,
    ignore_transaction boolean NOT NULL DEFAULT false,
    status text NOT NULL DEFAULT 'pending',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for performance
CREATE INDEX idx_manual_transactions_user ON public.manual_transactions(user_id);
CREATE INDEX idx_manual_transactions_type ON public.manual_transactions(type);
CREATE INDEX idx_manual_transactions_date ON public.manual_transactions(date);

-- Security
GRANT SELECT, INSERT, UPDATE, DELETE ON public.manual_transactions TO authenticated;
GRANT ALL ON public.manual_transactions TO service_role;

ALTER TABLE public.manual_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own transactions"
ON public.manual_transactions FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_manual_transactions_updated_at
BEFORE UPDATE ON public.manual_transactions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

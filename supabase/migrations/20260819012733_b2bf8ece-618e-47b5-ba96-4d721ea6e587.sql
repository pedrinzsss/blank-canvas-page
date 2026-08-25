CREATE TABLE IF NOT EXISTS public.antecipacoes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    charge_id uuid REFERENCES public.charges(id) ON DELETE SET NULL,
    customer_name text,
    amount_cents integer NOT NULL,
    payment_method text NOT NULL,
    status text DEFAULT 'pending',
    available_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.antecipacoes TO authenticated;
GRANT ALL ON public.antecipacoes TO service_role;

ALTER TABLE public.antecipacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own antecipacoes"
    ON public.antecipacoes FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
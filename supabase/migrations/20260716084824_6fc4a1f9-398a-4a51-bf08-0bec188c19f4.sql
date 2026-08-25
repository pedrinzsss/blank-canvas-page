
-- api_clients: owner manage
DROP POLICY IF EXISTS "Users manage own api_clients" ON public.api_clients;
CREATE POLICY "Users manage own api_clients"
  ON public.api_clients FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- api_keys: owner manage via client
DROP POLICY IF EXISTS "Users manage own api_keys" ON public.api_keys;
CREATE POLICY "Users manage own api_keys"
  ON public.api_keys FOR ALL
  USING (EXISTS (SELECT 1 FROM public.api_clients c WHERE c.id = api_keys.client_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.api_clients c WHERE c.id = api_keys.client_id AND c.user_id = auth.uid()));

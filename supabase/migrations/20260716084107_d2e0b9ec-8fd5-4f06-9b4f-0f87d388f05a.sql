
-- Extend webhook_endpoints
ALTER TABLE public.webhook_endpoints
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS secret_hash text,
  ADD COLUMN IF NOT EXISTS secret_prefix text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Extend webhook_deliveries: attempts, response body, next retry, event id (for dedup), signature
ALTER TABLE public.webhook_deliveries
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS response_body text,
  ADD COLUMN IF NOT EXISTS next_retry_at timestamptz,
  ADD COLUMN IF NOT EXISTS event_id text,
  ADD COLUMN IF NOT EXISTS signature text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Dedup: same (endpoint_id, event_id) can only exist once
CREATE UNIQUE INDEX IF NOT EXISTS webhook_deliveries_endpoint_event_uniq
  ON public.webhook_deliveries(endpoint_id, event_id)
  WHERE event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS webhook_deliveries_endpoint_created_idx
  ON public.webhook_deliveries(endpoint_id, created_at DESC);

-- RLS policies for user access via their api_clients
DROP POLICY IF EXISTS "Users manage own webhook endpoints" ON public.webhook_endpoints;
CREATE POLICY "Users manage own webhook endpoints"
  ON public.webhook_endpoints FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.api_clients c WHERE c.id = webhook_endpoints.client_id AND c.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.api_clients c WHERE c.id = webhook_endpoints.client_id AND c.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users read own webhook deliveries" ON public.webhook_deliveries;
CREATE POLICY "Users read own webhook deliveries"
  ON public.webhook_deliveries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.webhook_endpoints e
      JOIN public.api_clients c ON c.id = e.client_id
      WHERE e.id = webhook_deliveries.endpoint_id AND c.user_id = auth.uid()
    )
  );

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_webhook_endpoints_updated_at ON public.webhook_endpoints;
CREATE TRIGGER trg_webhook_endpoints_updated_at
  BEFORE UPDATE ON public.webhook_endpoints
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_webhook_deliveries_updated_at ON public.webhook_deliveries;
CREATE TRIGGER trg_webhook_deliveries_updated_at
  BEFORE UPDATE ON public.webhook_deliveries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own notifications" ON public.notifications
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX notifications_user_created_idx ON public.notifications(user_id, created_at DESC);

-- Affiliation status trigger (BEFORE INSERT): enforce mode
CREATE OR REPLACE FUNCTION public.set_affiliation_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mode TEXT;
BEGIN
  SELECT affiliation_mode INTO mode FROM public.products WHERE id = NEW.product_id;
  IF mode = 'disabled' THEN
    RAISE EXCEPTION 'Afiliações desativadas para este produto';
  ELSIF mode = 'open' THEN
    NEW.status := 'approved';
  ELSE
    NEW.status := 'pending';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER affiliations_set_status
BEFORE INSERT ON public.affiliations
FOR EACH ROW EXECUTE FUNCTION public.set_affiliation_status();

-- Notification on approval
CREATE OR REPLACE FUNCTION public.notify_affiliation_approved()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ptitle TEXT;
BEGIN
  IF NEW.status = 'approved' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'approved') THEN
    SELECT title INTO ptitle FROM public.products WHERE id = NEW.product_id;
    INSERT INTO public.notifications (user_id, title, body, link)
    VALUES (
      NEW.affiliate_user_id,
      'Afiliação aprovada',
      'Sua afiliação ao produto ''' || COALESCE(ptitle, '') || ''' foi aprovada. Clique para saber mais.',
      '/minhas-afiliacoes'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER affiliations_notify_approved
AFTER INSERT OR UPDATE OF status ON public.affiliations
FOR EACH ROW EXECUTE FUNCTION public.notify_affiliation_approved();

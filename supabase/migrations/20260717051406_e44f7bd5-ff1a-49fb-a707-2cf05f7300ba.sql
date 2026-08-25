
-- Allow anon + authenticated to read platform-assets objects (needed for signed URLs on login page)
DROP POLICY IF EXISTS "Public read platform-assets" ON storage.objects;
CREATE POLICY "Public read platform-assets"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'platform-assets');

-- Ensure realtime broadcasts platform_settings changes to other tabs/sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'platform_settings'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_settings';
  END IF;
END $$;

ALTER TABLE public.platform_settings REPLICA IDENTITY FULL;

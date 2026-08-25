
ALTER TABLE public.admin_collaborators ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'admin';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_collaborators TO authenticated;
GRANT ALL ON public.admin_collaborators TO service_role;

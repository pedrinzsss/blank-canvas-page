
REVOKE EXECUTE ON FUNCTION public.assign_admin_by_email() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;

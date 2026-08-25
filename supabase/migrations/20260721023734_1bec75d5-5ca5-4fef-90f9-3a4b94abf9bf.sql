UPDATE public.platform_settings
SET data = jsonb_set(COALESCE(data, '{}'::jsonb), '{secondary}', '"#1a1a1a"'::jsonb, true)
WHERE section = 'cores';
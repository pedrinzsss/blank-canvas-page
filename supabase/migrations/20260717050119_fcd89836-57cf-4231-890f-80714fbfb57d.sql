UPDATE public.platform_settings
SET data = jsonb_set(
  jsonb_set(data, '{primary_button_text}', '"#ffffff"'),
  '{secondary}', '"#1a1a1a"'
)
WHERE section = 'cores';
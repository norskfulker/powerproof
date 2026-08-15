-- Hide removed product surfaces from sidebar CMS (grow, workforce, register-business, etc.)
UPDATE public.app_pages
SET
  is_enabled = false,
  is_built = false,
  updated_at = now()
WHERE key IN (
  'grow',
  'workforce',
  'register-business',
  'register_business',
  'command-center',
  'command_center',
  'commandcenter',
  'design',
  'feed',
  'playbook',
  'sectors'
)
   OR slug LIKE '/command-center%'
   OR slug LIKE '/see-all/%'
   OR slug LIKE '/grow%'
   OR slug LIKE '/workforce%'
   OR slug LIKE '/register-business%'
   OR slug = '/design';

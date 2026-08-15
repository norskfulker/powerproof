-- v27 War Room playbook: candid co-founder assessment (separate from edge_declaration)
ALTER TABLE public.user_playbooks
  ADD COLUMN IF NOT EXISTS founder_honest_take text;

COMMENT ON COLUMN public.user_playbooks.founder_honest_take IS
  'v27 War Room: 3-4 sentence candid co-founder assessment returned by generate-playbook';

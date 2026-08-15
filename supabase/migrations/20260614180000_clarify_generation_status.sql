-- Allow mid-clarify sessions to persist with generation_status = 'clarifying'

ALTER TABLE public.user_playbooks
  DROP CONSTRAINT IF EXISTS user_playbooks_generation_status_check;

ALTER TABLE public.user_playbooks
  ADD CONSTRAINT user_playbooks_generation_status_check
  CHECK (
    generation_status = ANY (
      ARRAY['pending'::text, 'complete'::text, 'failed'::text, 'clarifying'::text]
    )
  );

ALTER TABLE public.user_roadmaps
  DROP CONSTRAINT IF EXISTS user_roadmaps_generation_status_check;

ALTER TABLE public.user_roadmaps
  ADD CONSTRAINT user_roadmaps_generation_status_check
  CHECK (
    generation_status = ANY (
      ARRAY[
        'pending'::text,
        'processing'::text,
        'complete'::text,
        'failed'::text,
        'clarifying'::text
      ]
    )
  );

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NULL;

COMMENT ON COLUMN public.projects.submitted_at IS
  'Timestamp when the leader submitted the project for evaluation. NULL means not yet submitted. Once set, deliverables and team membership are locked.';
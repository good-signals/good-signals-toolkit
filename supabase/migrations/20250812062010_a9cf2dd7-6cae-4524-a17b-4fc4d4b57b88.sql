-- Tighten read access on standard_target_metric_set_enabled_sections
-- 1) Drop PUBLIC read policy and replace with authenticated-only
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'standard_target_metric_set_enabled_sections' 
      AND policyname = 'Users can view standard enabled sections'
  ) THEN
    EXECUTE 'DROP POLICY "Users can view standard enabled sections" ON public.standard_target_metric_set_enabled_sections';
  END IF;
END$$;

-- 2) Ensure RLS is enabled (idempotent)
ALTER TABLE public.standard_target_metric_set_enabled_sections ENABLE ROW LEVEL SECURITY;

-- 3) Create authenticated-only SELECT policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'standard_target_metric_set_enabled_sections' 
      AND policyname = 'Authenticated users can view standard enabled sections'
  ) THEN
    CREATE POLICY "Authenticated users can view standard enabled sections"
    ON public.standard_target_metric_set_enabled_sections
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END$$;
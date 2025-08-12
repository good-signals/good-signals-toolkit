-- RLS hardening for public.account_custom_metrics
-- Ensure RLS is enabled
ALTER TABLE public.account_custom_metrics ENABLE ROW LEVEL SECURITY;

-- INSERT policy: only account admins of the target account can create
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'account_custom_metrics' 
      AND policyname = 'Account admins can insert custom metrics'
  ) THEN
    CREATE POLICY "Account admins can insert custom metrics"
      ON public.account_custom_metrics
      FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.account_memberships am
          WHERE am.account_id = account_custom_metrics.account_id
            AND am.user_id = auth.uid()
            AND am.role = 'account_admin'::public.app_role
        )
      );
  END IF;
END$$;

-- UPDATE policy: only account admins of the row's account can modify
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'account_custom_metrics' 
      AND policyname = 'Account admins can update custom metrics'
  ) THEN
    CREATE POLICY "Account admins can update custom metrics"
      ON public.account_custom_metrics
      FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.account_memberships am
          WHERE am.account_id = account_custom_metrics.account_id
            AND am.user_id = auth.uid()
            AND am.role = 'account_admin'::public.app_role
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.account_memberships am
          WHERE am.account_id = account_custom_metrics.account_id
            AND am.user_id = auth.uid()
            AND am.role = 'account_admin'::public.app_role
        )
      );
  END IF;
END$$;

-- DELETE policy: only account admins of the row's account can delete
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'account_custom_metrics' 
      AND policyname = 'Account admins can delete custom metrics'
  ) THEN
    CREATE POLICY "Account admins can delete custom metrics"
      ON public.account_custom_metrics
      FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.account_memberships am
          WHERE am.account_id = account_custom_metrics.account_id
            AND am.user_id = auth.uid()
            AND am.role = 'account_admin'::public.app_role
        )
      );
  END IF;
END$$;

-- Optional: keep existing SELECT policy for members; if missing, add a safe one
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'account_custom_metrics' 
      AND policyname = 'Account members can view custom metrics'
  ) THEN
    CREATE POLICY "Account members can view custom metrics"
      ON public.account_custom_metrics
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.account_memberships am
          WHERE am.account_id = account_custom_metrics.account_id
            AND am.user_id = auth.uid()
        )
      );
  END IF;
END$$;

-- Ensure updated_at is kept current on changes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE t.tgname = 'trg_account_custom_metrics_updated_at'
      AND n.nspname = 'public'
  ) THEN
    EXECUTE 'CREATE TRIGGER trg_account_custom_metrics_updated_at
      BEFORE UPDATE ON public.account_custom_metrics
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column()';
  END IF;
END$$;
-- Secure accounts visibility
-- 1) Drop overly permissive policy that allowed all authenticated users to view all accounts
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'accounts' 
      AND policyname = 'Authenticated users can view all accounts'
  ) THEN
    EXECUTE 'DROP POLICY "Authenticated users can view all accounts" ON public.accounts';
  END IF;
END$$;

-- 2) Ensure RLS is enabled (idempotent)
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- 3) Add super admin visibility policy so platform admin retains access to all accounts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'accounts' 
      AND policyname = 'Super admin can view all accounts'
  ) THEN
    CREATE POLICY "Super admin can view all accounts"
    ON public.accounts
    FOR SELECT
    USING ((auth.jwt() ->> 'email') = 'howdy@goodsignals.ai');
  END IF;
END$$;
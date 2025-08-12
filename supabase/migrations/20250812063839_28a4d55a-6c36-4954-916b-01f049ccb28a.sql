-- Fix dangerous policy allowing users to self-assign admin role on any account
-- Remove the permissive INSERT policy on account_memberships
DROP POLICY IF EXISTS "Users can make themselves an account admin for an account" ON public.account_memberships;

-- Note: Service role-based edge functions (e.g., create-account-and-admin) can still insert rows as they bypass RLS.
-- If future UI needs to manage memberships, implement a dedicated edge function that validates the caller's admin role before inserting.
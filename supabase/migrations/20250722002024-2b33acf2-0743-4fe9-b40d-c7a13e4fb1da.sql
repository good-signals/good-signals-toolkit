
-- Create table for custom metric sections
CREATE TABLE public.custom_metric_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(account_id, name)
);

-- Add Row Level Security (RLS)
ALTER TABLE public.custom_metric_sections ENABLE ROW LEVEL SECURITY;

-- Create policy that allows account admins to manage custom sections
CREATE POLICY "Account admins can manage custom sections" 
  ON public.custom_metric_sections 
  FOR ALL 
  USING (EXISTS (
    SELECT 1 
    FROM account_memberships am 
    WHERE am.account_id = custom_metric_sections.account_id
    AND am.user_id = auth.uid() 
    AND am.role = 'account_admin'::app_role
  ));

-- Create policy that allows account members to view custom sections
CREATE POLICY "Account members can view custom sections" 
  ON public.custom_metric_sections 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 
    FROM account_memberships am 
    WHERE am.account_id = custom_metric_sections.account_id
    AND am.user_id = auth.uid()
  ));

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_custom_metric_sections_updated_at
  BEFORE UPDATE ON public.custom_metric_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

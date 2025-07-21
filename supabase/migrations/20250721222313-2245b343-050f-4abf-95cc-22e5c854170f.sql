
-- Create table to track which optional sections are enabled for each metric set
CREATE TABLE public.target_metric_set_enabled_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_set_id UUID NOT NULL REFERENCES public.target_metric_sets(id) ON DELETE CASCADE,
  section_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(metric_set_id, section_name)
);

-- Add Row Level Security (RLS)
ALTER TABLE public.target_metric_set_enabled_sections ENABLE ROW LEVEL SECURITY;

-- Create policy that allows account admins to manage enabled sections
CREATE POLICY "Account admins can manage enabled sections" 
  ON public.target_metric_set_enabled_sections 
  FOR ALL 
  USING (EXISTS (
    SELECT 1 
    FROM target_metric_sets tms
    JOIN account_memberships am ON am.account_id = tms.account_id
    WHERE tms.id = target_metric_set_enabled_sections.metric_set_id
    AND am.user_id = auth.uid() 
    AND am.role = 'account_admin'::app_role
  ));

-- Create the same table for standard metric sets
CREATE TABLE public.standard_target_metric_set_enabled_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_set_id UUID NOT NULL REFERENCES public.standard_target_metric_sets(id) ON DELETE CASCADE,
  section_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(metric_set_id, section_name)
);

-- Add Row Level Security (RLS) for standard sections
ALTER TABLE public.standard_target_metric_set_enabled_sections ENABLE ROW LEVEL SECURITY;

-- Create policy for super admin to manage standard enabled sections
CREATE POLICY "Super admin can manage standard enabled sections" 
  ON public.standard_target_metric_set_enabled_sections 
  FOR ALL 
  USING (auth.jwt() ->> 'email' = 'howdy@goodsignals.ai');

-- Create policy for users to view standard enabled sections
CREATE POLICY "Users can view standard enabled sections" 
  ON public.standard_target_metric_set_enabled_sections 
  FOR SELECT 
  USING (true);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_target_metric_set_enabled_sections_updated_at
  BEFORE UPDATE ON public.target_metric_set_enabled_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_standard_target_metric_set_enabled_sections_updated_at
  BEFORE UPDATE ON public.standard_target_metric_set_enabled_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate existing metric sets to have all optional sections enabled by default
INSERT INTO public.target_metric_set_enabled_sections (metric_set_id, section_name)
SELECT id, 'Market Coverage & Saturation' FROM public.target_metric_sets
UNION ALL
SELECT id, 'Demand & Spending' FROM public.target_metric_sets
UNION ALL
SELECT id, 'Expenses' FROM public.target_metric_sets;

-- Migrate existing standard metric sets to have all optional sections enabled by default
INSERT INTO public.standard_target_metric_set_enabled_sections (metric_set_id, section_name)
SELECT id, 'Market Coverage & Saturation' FROM public.standard_target_metric_sets
UNION ALL
SELECT id, 'Demand & Spending' FROM public.standard_target_metric_sets
UNION ALL
SELECT id, 'Expenses' FROM public.standard_target_metric_sets;

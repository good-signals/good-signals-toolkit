
import { supabase } from '@/integrations/supabase/client';

export const updateSiteStatus = async (assessmentId: string, status: string): Promise<void> => {
  const { error } = await supabase
    .from('site_assessments')
    .update({ site_status: status })
    .eq('id', assessmentId);

  if (error) {
    throw new Error(`Failed to update site status: ${error.message}`);
  }
};

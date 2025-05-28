
import { supabase } from '@/integrations/supabase/client';
import { 
  AssessmentMetricValue,
  AssessmentMetricValueInsert
} from '@/types/siteAssessmentTypes';

export const saveAssessmentMetricValues = async (
  assessmentId: string,
  metricValues: AssessmentMetricValueInsert[]
): Promise<AssessmentMetricValue[]> => {
  const valuesToSave = metricValues.map(mv => ({
    ...mv,
    assessment_id: assessmentId,
    // For image-only metrics, use 0 as placeholder value since entered_value cannot be null
    entered_value: mv.entered_value !== null ? mv.entered_value : 0,
  }));

  const { data, error } = await supabase
    .from('assessment_metric_values')
    .upsert(valuesToSave, { onConflict: 'assessment_id, metric_identifier' })
    .select();

  if (error) {
    console.error('Error saving assessment metric values:', error);
    throw error;
  }
  return data || [];
};

export const getAssessmentMetricValues = async (assessmentId: string): Promise<AssessmentMetricValue[]> => {
  const { data, error } = await supabase
    .from('assessment_metric_values')
    .select('*')
    .eq('assessment_id', assessmentId);

  if (error) {
    console.error('Error fetching assessment metric values:', error);
    throw error;
  }
  return data || [];
};

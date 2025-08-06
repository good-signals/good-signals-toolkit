import { supabase } from '@/integrations/supabase/client';
import { 
  AssessmentMetricValue,
  AssessmentMetricValueInsert
} from '@/types/siteAssessmentTypes';

export const saveAssessmentMetricValues = async (
  assessmentId: string,
  metricValues: AssessmentMetricValueInsert[]
): Promise<AssessmentMetricValue[]> => {
  console.log('[saveAssessmentMetricValues] Starting save operation:', {
    assessmentId,
    metricValuesCount: metricValues.length
  });

  // Force session refresh and verify authentication
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  console.log('[saveAssessmentMetricValues] Initial session check:', { 
    hasSession: !!session, 
    hasUser: !!session?.user,
    userId: session?.user?.id,
    sessionError 
  });

  if (!session?.user) {
    console.error('[saveAssessmentMetricValues] No authenticated user found');
    throw new Error('You must be logged in to save assessment data');
  }

  // Refresh the session to ensure we have valid tokens
  try {
    const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
    console.log('[saveAssessmentMetricValues] Session refresh result:', {
      refreshSuccess: !!refreshedSession,
      refreshError: refreshError?.message
    });
    
    if (refreshError) {
      console.warn('[saveAssessmentMetricValues] Session refresh failed, proceeding with existing session');
    }
  } catch (refreshErr) {
    console.warn('[saveAssessmentMetricValues] Session refresh exception:', refreshErr);
  }

  // Verify user owns the assessment before attempting to save metric values
  console.log('[saveAssessmentMetricValues] Verifying assessment ownership for user:', session.user.id);
  const { data: assessment, error: assessmentError } = await supabase
    .from('site_assessments')
    .select('id, user_id')
    .eq('id', assessmentId)
    .eq('user_id', session.user.id)
    .single();

  if (assessmentError || !assessment) {
    console.error('[saveAssessmentMetricValues] Assessment verification failed:', {
      error: assessmentError,
      hasAssessment: !!assessment
    });
    throw new Error('Assessment not found or access denied');
  }

  console.log('[saveAssessmentMetricValues] Assessment ownership verified:', {
    assessmentId: assessment.id,
    userId: assessment.user_id
  });

  const valuesToSave = metricValues.map(mv => ({
    ...mv,
    assessment_id: assessmentId,
    // Preserve null values - don't convert empty values to zero
    entered_value: mv.entered_value === undefined ? null : mv.entered_value,
  }));

  console.log('[saveAssessmentMetricValues] Data prepared for save:', {
    valuesToSaveCount: valuesToSave.length,
    sampleValue: valuesToSave[0]
  });

  // Use explicit session for the database operation
  const { data, error } = await supabase
    .from('assessment_metric_values')
    .upsert(valuesToSave, { onConflict: 'assessment_id, metric_identifier' })
    .select();

  if (error) {
    console.error('[saveAssessmentMetricValues] Database error:', error);
    console.error('[saveAssessmentMetricValues] Error details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
    
    // Provide more specific error messages
    if (error.message.includes('row-level security policy')) {
      throw new Error('Authentication error: Unable to save assessment data. Please try logging out and back in.');
    }
    
    if (error.message.includes('null value') && error.message.includes('not-null constraint')) {
      throw new Error('Data validation error: Please ensure all required fields are filled properly.');
    }
    
    if (error.code === '23505') {
      throw new Error('A metric with this identifier already exists for this assessment.');
    }
    
    throw new Error(`Failed to save assessment data: ${error.message}`);
  }

  console.log('[saveAssessmentMetricValues] Save successful:', {
    savedCount: data?.length || 0
  });

  return data || [];
};

export const getAssessmentMetricValues = async (assessmentId: string): Promise<AssessmentMetricValue[]> => {
  console.log('[getAssessmentMetricValues] Fetching values for assessment:', assessmentId);

  // Check authentication before proceeding
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  console.log('[getAssessmentMetricValues] Session check:', { 
    hasSession: !!session, 
    hasUser: !!session?.user,
    sessionError 
  });

  if (!session?.user) {
    console.error('[getAssessmentMetricValues] No authenticated user found');
    throw new Error('You must be logged in to view assessment data');
  }

  const { data, error } = await supabase
    .from('assessment_metric_values')
    .select('*')
    .eq('assessment_id', assessmentId);

  if (error) {
    console.error('[getAssessmentMetricValues] Database error:', error);
    throw new Error(`Failed to fetch assessment data: ${error.message}`);
  }

  console.log('[getAssessmentMetricValues] Fetch successful:', {
    fetchedCount: data?.length || 0
  });

  return data || [];
};

// New function to get metric values merged with target metric set configuration
export const getAssessmentMetricValuesWithTargets = async (
  assessmentId: string, 
  targetMetricSetId: string,
  userId: string
): Promise<AssessmentMetricValue[]> => {
  console.log('[getAssessmentMetricValuesWithTargets] Fetching values with targets for assessment:', assessmentId);

  // Get existing assessment metric values
  const existingValues = await getAssessmentMetricValues(assessmentId);
  
  // Get target metric set configuration
  const { getUserCustomMetricSettings } = await import('@/services/targetMetricsService');
  const targetSettings = await getUserCustomMetricSettings(targetMetricSetId);

  console.log('[getAssessmentMetricValuesWithTargets] Found:', {
    existingValuesCount: existingValues.length,
    targetSettingsCount: targetSettings.length
  });

  // Create a map of existing values by metric identifier
  const existingValuesMap = new Map<string, AssessmentMetricValue>();
  existingValues.forEach(value => {
    existingValuesMap.set(value.metric_identifier, value);
  });

  // Create complete metric values array with all target metrics
  const completeMetricValues: AssessmentMetricValue[] = [];

  targetSettings.forEach(setting => {
    const existingValue = existingValuesMap.get(setting.metric_identifier);
    
    if (existingValue) {
      // Use existing value
      completeMetricValues.push(existingValue);
    } else {
      // Create placeholder metric value for missing metrics
      completeMetricValues.push({
        id: `placeholder-${setting.metric_identifier}`,
        assessment_id: assessmentId,
        metric_identifier: setting.metric_identifier,
        category: setting.category,
        label: setting.label,
        entered_value: null,
        notes: null,
        measurement_type: setting.measurement_type || null,
        image_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
  });

  console.log('[getAssessmentMetricValuesWithTargets] Complete metric values created:', {
    completeCount: completeMetricValues.length
  });

  return completeMetricValues;
};


import { recalculateAssessmentScoresForMetricSet } from '../assessmentRecalculationService';

// New function to trigger assessment recalculation
export async function triggerAssessmentRecalculation(
  metricSetId: string, 
  userId: string
): Promise<{ success: boolean; message: string; details?: any }> {
  try {
    const result = await recalculateAssessmentScoresForMetricSet(metricSetId, userId);
    
    if (result.errors.length > 0) {
      console.warn('Recalculation completed with errors:', result.errors);
      return {
        success: true,
        message: `Updated ${result.updated} assessments with ${result.errors.length} errors`,
        details: result
      };
    }
    
    return {
      success: true,
      message: `Successfully updated ${result.updated} assessments`,
      details: result
    };
  } catch (error) {
    console.error('Failed to trigger assessment recalculation:', error);
    return {
      success: false,
      message: 'Failed to recalculate assessment scores',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}

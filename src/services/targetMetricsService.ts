
// Re-export all functions from the refactored services for backward compatibility
export {
  createTargetMetricSet,
  getTargetMetricSets,
  getTargetMetricSetById,
  updateTargetMetricSetName,
  deleteTargetMetricSet,
  hasUserSetAnyMetrics,
} from './targetMetrics/targetMetricSetService';

export {
  getUserCustomMetricSettings,
  saveUserCustomMetricSettings,
  saveUserStandardMetricsPreference,
} from './targetMetrics/userMetricSettingsService';

export {
  triggerAssessmentRecalculation,
} from './targetMetrics/metricRecalculationService';

export {
  getUserAccountId,
} from './targetMetrics/accountHelpers';

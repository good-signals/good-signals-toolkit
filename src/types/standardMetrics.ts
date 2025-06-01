
export interface StandardTargetMetricSet {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface StandardTargetMetricSetting {
  id: string;
  metric_set_id: string;
  metric_identifier: string;
  label: string;
  category: string;
  target_value: number;
  higher_is_better: boolean;
  measurement_type?: string;
  units?: string;
  is_custom: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateStandardMetricSetData {
  name: string;
  description?: string;
}

export interface StandardMetricsFormData {
  metric_set_id?: string;
  metric_set_name: string;
  metric_set_description?: string;
  predefined_metrics: Array<{
    metric_identifier: string;
    label: string;
    category: string;
    target_value: number;
    higher_is_better: boolean;
  }>;
  custom_metrics: Array<{
    metric_identifier: string;
    label: string;
    category: string;
    target_value: number;
    higher_is_better: boolean;
    units?: string;
    is_custom: true;
  }>;
  visitor_profile_metrics: Array<{
    metric_identifier: string;
    label: string;
    category: string;
    target_value: number;
    measurement_type?: string;
    higher_is_better: boolean;
  }>;
}

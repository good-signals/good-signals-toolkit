
import { z } from 'zod';

export const PREDEFINED_METRIC_CATEGORIES = [
  "Traffic",
  "Trade Area",
  "Market Coverage & Saturation",
  "Demand & Supply",
  "Expenses",
  "Financial Performance",
] as const;

export const VISITOR_PROFILE_CATEGORY = "Visitor Profile" as const;

export const ALL_METRIC_CATEGORIES = [...PREDEFINED_METRIC_CATEGORIES, VISITOR_PROFILE_CATEGORY] as const;

export type PredefinedMetricCategory = typeof PREDEFINED_METRIC_CATEGORIES[number];
export type VisitorProfileCategory = typeof VISITOR_PROFILE_CATEGORY;
export type MetricCategory = typeof ALL_METRIC_CATEGORIES[number];

export const MEASUREMENT_TYPES = ["Index", "Amount"] as const;
export type MeasurementType = typeof MEASUREMENT_TYPES[number];

// Schema for a single custom metric setting from the database
export const UserCustomMetricSettingSchema = z.object({
  id: z.string().uuid().optional(), // Made optional as it's DB generated
  user_id: z.string().uuid(),
  account_id: z.string().uuid(), // Added account_id
  metric_set_id: z.string().uuid(),
  metric_identifier: z.string().min(1),
  category: z.string().min(1),
  label: z.string().min(1),
  target_value: z.number(),
  measurement_type: z.enum(MEASUREMENT_TYPES).nullable(),
  higher_is_better: z.boolean(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});
export type UserCustomMetricSetting = z.infer<typeof UserCustomMetricSettingSchema>;

// Schema for a target metric set from the database
export const TargetMetricSetSchema = z.object({
  id: z.string().uuid(),
  account_id: z.string().uuid(), // Changed from user_id to account_id
  name: z.string().min(1, "Set name is required."),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  user_custom_metrics_settings: z.array(UserCustomMetricSettingSchema).optional(),
});
export type TargetMetricSet = z.infer<typeof TargetMetricSetSchema>;

// Schema for the form
const PredefinedMetricFormSchema = z.object({
  metric_identifier: z.string(),
  label: z.string(),
  category: z.string(),
  target_value: z.coerce.number({ invalid_type_error: "Target value must be a number." }),
  higher_is_better: z.boolean(),
});

const VisitorProfileMetricFormSchema = z.object({
  metric_identifier: z.string(),
  label: z.string().min(1, "Attribute name is required."),
  category: z.literal(VISITOR_PROFILE_CATEGORY),
  target_value: z.coerce.number({ invalid_type_error: "Target value must be a number." }),
  measurement_type: z.enum(MEASUREMENT_TYPES, { required_error: "Measurement type is required."}),
  higher_is_better: z.boolean(),
});
export type VisitorProfileMetricFormData = z.infer<typeof VisitorProfileMetricFormSchema>;

export const TargetMetricsFormSchema = z.object({
  metric_set_id: z.string().uuid().optional(), // For identifying which set is being edited
  metric_set_name: z.string().min(1, "Metric set name is required."),
  predefined_metrics: z.array(PredefinedMetricFormSchema),
  visitor_profile_metrics: z.array(VisitorProfileMetricFormSchema),
});
export type TargetMetricsFormData = z.infer<typeof TargetMetricsFormSchema>;

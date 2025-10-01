
import { z } from 'zod';

export const REQUIRED_METRIC_CATEGORIES = [
  "Traffic",
  "Financial Performance",
] as const;

export const OPTIONAL_METRIC_CATEGORIES = [
  "Trade Area",
  "Market Coverage & Saturation",
  "Demand & Spending",
  "Expenses",
] as const;

export const PREDEFINED_METRIC_CATEGORIES = [...REQUIRED_METRIC_CATEGORIES, ...OPTIONAL_METRIC_CATEGORIES] as const;

export const VISITOR_PROFILE_CATEGORY = "Visitor Profile" as const;
export const SITE_VISIT_CATEGORY = "Site Visit" as const;

export const ALL_METRIC_CATEGORIES = [...PREDEFINED_METRIC_CATEGORIES, VISITOR_PROFILE_CATEGORY] as const;

export type RequiredMetricCategory = typeof REQUIRED_METRIC_CATEGORIES[number];
export type OptionalMetricCategory = typeof OPTIONAL_METRIC_CATEGORIES[number];
export type PredefinedMetricCategory = typeof PREDEFINED_METRIC_CATEGORIES[number];
export type VisitorProfileCategory = typeof VISITOR_PROFILE_CATEGORY;
export type SiteVisitCategory = typeof SITE_VISIT_CATEGORY;
export type MetricCategory = typeof ALL_METRIC_CATEGORIES[number];

export const MEASUREMENT_TYPES = ["Index", "Amount", "Percentage"] as const;
export type MeasurementType = typeof MEASUREMENT_TYPES[number];

// Schema for account custom metrics
export const AccountCustomMetricSchema = z.object({
  id: z.string().uuid(),
  account_id: z.string().uuid(),
  metric_identifier: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable(),
  category: z.string().min(1),
  units: z.string().nullable(),
  default_target_value: z.number().nullable(),
  higher_is_better: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type AccountCustomMetric = z.infer<typeof AccountCustomMetricSchema>;

// Schema for creating custom metrics
export const CreateCustomMetricFormSchema = z.object({
  name: z.string().min(1, "Metric name is required"),
  description: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  units: z.string().optional(),
  default_target_value: z.coerce.number().optional(),
  higher_is_better: z.boolean(),
});
export type CreateCustomMetricFormData = z.infer<typeof CreateCustomMetricFormSchema>;

// Schema for creating target metric sets
export const CreateTargetMetricSetSchema = z.object({
  name: z.string().min(1, "Set name is required"),
});
export type CreateTargetMetricSetData = z.infer<typeof CreateTargetMetricSetSchema>;

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
  measurement_type: z.string().nullable(), // Changed from enum to string to match database
  higher_is_better: z.boolean(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});
export type UserCustomMetricSetting = z.infer<typeof UserCustomMetricSettingSchema>;

// Schema for a target metric set from the database - ensuring required fields are non-optional
export const TargetMetricSetSchema = z.object({
  id: z.string().uuid(),
  account_id: z.string().uuid(), 
  name: z.string().min(1, "Set name is required."),
  created_at: z.string(),
  updated_at: z.string(),
  has_enabled_sections_data: z.boolean(),
  user_custom_metrics_settings: z.array(UserCustomMetricSettingSchema).optional(),
  enabled_optional_sections: z.array(z.string()).optional(),
});
export type TargetMetricSet = z.infer<typeof TargetMetricSetSchema>;

// Schema for the form
const PredefinedMetricFormSchema = z.object({
  metric_identifier: z.string(),
  label: z.string(),
  category: z.string(),
  target_value: z.coerce.number({ 
    invalid_type_error: "Target value must be a number.",
    required_error: "Target value is required."
  }).positive("Target value must be greater than 0"),
  higher_is_better: z.boolean(),
  id: z.string().optional(), // Add optional id for database records
});

const CustomMetricFormSchema = z.object({
  metric_identifier: z.string(),
  label: z.string(),
  category: z.string(),
  target_value: z.coerce.number({ 
    invalid_type_error: "Target value must be a number.",
    required_error: "Target value is required."
  }).positive("Target value must be greater than 0"),
  higher_is_better: z.boolean(),
  units: z.string().optional(),
  is_custom: z.literal(true),
  id: z.string().optional(), // Add optional id for database records
});

const VisitorProfileMetricFormSchema = z.object({
  metric_identifier: z.string(),
  label: z.string().min(1, "Attribute name is required."),
  category: z.literal(VISITOR_PROFILE_CATEGORY),
  target_value: z.coerce.number({ 
    invalid_type_error: "Target value must be a number.",
    required_error: "Target value is required."
  }).positive("Target value must be greater than 0"),
  measurement_type: z.enum(MEASUREMENT_TYPES, { required_error: "Measurement type is required."}),
  higher_is_better: z.boolean(),
  id: z.string().optional(), // Add optional id for database records
});
export type VisitorProfileMetricFormData = z.infer<typeof VisitorProfileMetricFormSchema>;

export const TargetMetricsFormSchema = z.object({
  metric_set_id: z.string().uuid().optional(), // For identifying which set is being edited
  metric_set_name: z.string().min(1, "Metric set name is required."),
  predefined_metrics: z.array(PredefinedMetricFormSchema),
  custom_metrics: z.array(CustomMetricFormSchema),
  visitor_profile_metrics: z.array(VisitorProfileMetricFormSchema),
  enabled_optional_sections: z.array(z.string()).default([]), // Track which optional sections are enabled
});
export type TargetMetricsFormData = z.infer<typeof TargetMetricsFormSchema>;

// Helper functions for section categorization
export const isRequiredCategory = (category: string): category is RequiredMetricCategory => {
  return REQUIRED_METRIC_CATEGORIES.includes(category as RequiredMetricCategory);
};

export const isOptionalCategory = (category: string): category is OptionalMetricCategory => {
  return OPTIONAL_METRIC_CATEGORIES.includes(category as OptionalMetricCategory);
};

export const isSiteVisitCategory = (category: string): category is SiteVisitCategory => {
  return category === SITE_VISIT_CATEGORY;
};


import { z } from 'zod';

export const StandardTargetMetricSetSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().nullable(),
  created_by: z.string().uuid(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type StandardTargetMetricSet = z.infer<typeof StandardTargetMetricSetSchema>;

export const StandardTargetMetricSettingSchema = z.object({
  id: z.string().uuid().optional(),
  standard_set_id: z.string().uuid(),
  metric_identifier: z.string().min(1),
  category: z.string().min(1),
  label: z.string().min(1),
  target_value: z.number(),
  measurement_type: z.string().nullable(),
  higher_is_better: z.boolean(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type StandardTargetMetricSetting = z.infer<typeof StandardTargetMetricSettingSchema>;

export const CreateStandardMetricSetSchema = z.object({
  name: z.string().min(1, "Set name is required"),
  description: z.string().optional(),
});

export type CreateStandardMetricSetData = z.infer<typeof CreateStandardMetricSetSchema>;

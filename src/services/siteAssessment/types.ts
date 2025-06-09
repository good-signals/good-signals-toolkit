import { TargetMetricSet } from '@/types/targetMetrics';

export interface SiteAssessment {
  id: string;
  user_id: string;
  account_id: string;
  assessment_name?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state_province?: string | null;
  postal_code?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  site_status?: string | null;
  target_metric_set_id?: string | null;
  completion_percentage?: number | null;
  site_signal_score?: number | null;
  executive_summary?: string | null;
  last_summary_generated_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SiteAssessmentMetric {
  id: string;
  site_assessment_id: string;
  metric_id: string;
  metric_value?: number | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SiteAssessmentComment {
  id: string;
  site_assessment_id: string;
  user_id: string;
  comment_text: string;
  created_at?: string;
}

export interface SiteAssessmentAttachment {
  id: string;
  site_assessment_id: string;
  file_name: string;
  file_url: string;
  file_type?: string | null;
  file_size?: number | null;
  created_at?: string;
}

export interface SiteAssessmentWithMetrics {
  siteAssessment: SiteAssessment;
  siteAssessmentMetrics: SiteAssessmentMetric[];
  targetMetricSet?: TargetMetricSet | null;
}

export type SiteAssessmentStatus =
  | 'draft'
  | 'in_progress'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'completed';

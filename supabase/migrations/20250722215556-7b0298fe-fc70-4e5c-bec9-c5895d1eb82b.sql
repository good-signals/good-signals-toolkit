-- Drop the incorrect unique constraint that prevents users from having same metric identifiers across different metric sets
ALTER TABLE user_custom_metrics_settings DROP CONSTRAINT IF EXISTS user_metric_identifier_unique;

-- The correct constraint already exists (uq_metric_set_metric_identifier) which ensures 
-- unique metric identifiers per metric set, which is what we want
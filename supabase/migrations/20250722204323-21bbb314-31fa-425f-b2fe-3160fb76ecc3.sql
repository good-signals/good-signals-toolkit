
-- Add has_enabled_sections_data column to target_metric_sets table
ALTER TABLE target_metric_sets 
ADD COLUMN has_enabled_sections_data boolean NOT NULL DEFAULT false;

-- Update the default for new records to be true
ALTER TABLE target_metric_sets 
ALTER COLUMN has_enabled_sections_data SET DEFAULT true;

-- Add a comment to explain the purpose
COMMENT ON COLUMN target_metric_sets.has_enabled_sections_data IS 'Flag to indicate if this metric set has explicit enabled sections data (true for new sets) or should use inference logic (false for legacy sets)';

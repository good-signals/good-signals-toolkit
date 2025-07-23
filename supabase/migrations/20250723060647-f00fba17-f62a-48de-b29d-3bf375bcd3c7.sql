
-- Allow null values in the entered_value column of assessment_metric_values
ALTER TABLE assessment_metric_values 
ALTER COLUMN entered_value DROP NOT NULL;

-- Update existing records that have placeholder zeros to null
-- We'll be conservative and only update records where entered_value is 0 AND notes is null or empty
-- This helps distinguish between user-entered zeros and system-populated placeholder zeros
UPDATE assessment_metric_values 
SET entered_value = NULL 
WHERE entered_value = 0 
AND (notes IS NULL OR notes = '');

-- Update target values for "Myo - CA - LA - Existing Locations" metric set
-- First, let's find the metric set and user to ensure we're updating the right records

-- Update Financial Performance metrics
UPDATE user_custom_metrics_settings 
SET target_value = 2533333
WHERE metric_identifier = 'initial_investment' 
  AND metric_set_id IN (
    SELECT id FROM target_metric_sets 
    WHERE name = 'Myo - CA - LA - Existing Locations'
  );

UPDATE user_custom_metrics_settings 
SET target_value = 5166667
WHERE metric_identifier = 'top_line_revenue_y3' 
  AND metric_set_id IN (
    SELECT id FROM target_metric_sets 
    WHERE name = 'Myo - CA - LA - Existing Locations'
  );

UPDATE user_custom_metrics_settings 
SET target_value = 14
WHERE metric_identifier = 'profitability_y3' 
  AND metric_set_id IN (
    SELECT id FROM target_metric_sets 
    WHERE name = 'Myo - CA - LA - Existing Locations'
  );

UPDATE user_custom_metrics_settings 
SET target_value = 3.533333333
WHERE metric_identifier = 'payback_period' 
  AND metric_set_id IN (
    SELECT id FROM target_metric_sets 
    WHERE name = 'Myo - CA - LA - Existing Locations'
  );

-- Update Trade Area metrics
UPDATE user_custom_metrics_settings 
SET target_value = 3066667
WHERE metric_identifier = 'trade_area_population' 
  AND metric_set_id IN (
    SELECT id FROM target_metric_sets 
    WHERE name = 'Myo - CA - LA - Existing Locations'
  );

UPDATE user_custom_metrics_settings 
SET target_value = 30
WHERE metric_identifier = 'trade_area_size' 
  AND metric_set_id IN (
    SELECT id FROM target_metric_sets 
    WHERE name = 'Myo - CA - LA - Existing Locations'
  );

UPDATE user_custom_metrics_settings 
SET target_value = 2983333
WHERE metric_identifier = 'daytime_population' 
  AND metric_set_id IN (
    SELECT id FROM target_metric_sets 
    WHERE name = 'Myo - CA - LA - Existing Locations'
  );

UPDATE user_custom_metrics_settings 
SET target_value = 11
WHERE metric_identifier = 'occupancy_rate' 
  AND metric_set_id IN (
    SELECT id FROM target_metric_sets 
    WHERE name = 'Myo - CA - LA - Existing Locations'
  );

-- Update Traffic metrics
UPDATE user_custom_metrics_settings 
SET target_value = 1066667
WHERE metric_identifier = 'annual_visits' 
  AND metric_set_id IN (
    SELECT id FROM target_metric_sets 
    WHERE name = 'Myo - CA - LA - Existing Locations'
  );

UPDATE user_custom_metrics_settings 
SET target_value = 373333
WHERE metric_identifier = 'annual_unique_visitors' 
  AND metric_set_id IN (
    SELECT id FROM target_metric_sets 
    WHERE name = 'Myo - CA - LA - Existing Locations'
  );

UPDATE user_custom_metrics_settings 
SET target_value = 2.86
WHERE metric_identifier = 'visit_frequency' 
  AND metric_set_id IN (
    SELECT id FROM target_metric_sets 
    WHERE name = 'Myo - CA - LA - Existing Locations'
  );

UPDATE user_custom_metrics_settings 
SET target_value = 105
WHERE metric_identifier = 'dwell_time' 
  AND metric_set_id IN (
    SELECT id FROM target_metric_sets 
    WHERE name = 'Myo - CA - LA - Existing Locations'
  );

export const metricDropdownOptions: Record<string, Array<{ label: string; value: number }>> = {
  market_saturation_trade_area_overlap: [
    { label: "No Overlap", value: 100 },
    { label: "Some Overlap", value: 50 },
    { label: "Major Overlap", value: 0 },
  ],
  market_saturation_heat_map_intersection: [
    { label: "Cold Spot", value: 100 },
    { label: "Warm Spot", value: 50 },
    { label: "Hot Spot", value: 0 },
  ],
  demand_supply_balance: [ // This one was already correctly handled but good to keep in shared config
    { label: "Positive Demand", value: 100 },
    { label: "Equal Demand", value: 50 },
    { label: "Negative Demand", value: 0 },
  ],
};

export const specificDropdownMetrics = Object.keys(metricDropdownOptions);

/**
 * Helper function to get the label for a metric value if it's a dropdown metric.
 * @param metricIdentifier The identifier of the metric.
 * @param value The numeric value of the metric.
 * @returns The label if found, otherwise null.
 */
export const getMetricLabelForValue = (metricIdentifier: string, value: number | null | undefined): string | null => {
  if (value === null || value === undefined) return null;
  if (specificDropdownMetrics.includes(metricIdentifier)) {
    const options = metricDropdownOptions[metricIdentifier];
    const foundOption = options.find(option => option.value === value);
    return foundOption ? foundOption.label : null;
  }
  return null;
};


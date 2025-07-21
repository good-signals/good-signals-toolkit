
import { 
  PredefinedMetricCategory, 
  UserCustomMetricSetting,
  REQUIRED_METRIC_CATEGORIES,
  OPTIONAL_METRIC_CATEGORIES,
  SITE_VISIT_CATEGORY,
  VISITOR_PROFILE_CATEGORY,
  isRequiredCategory,
  isOptionalCategory
} from '@/types/targetMetrics';

export interface PredefinedMetricConfig {
  metric_identifier: string;
  label: string;
  category: PredefinedMetricCategory;
  higher_is_better: boolean;
  description?: string;
}

export const predefinedMetricsConfig: PredefinedMetricConfig[] = [
  // Traffic
  { metric_identifier: "traffic_annual_visits", label: "Annual Visits", category: "Traffic", higher_is_better: true, description: "Total number of visits annually." },
  { metric_identifier: "traffic_unique_visitors", label: "Unique Visitors", category: "Traffic", higher_is_better: true, description: "Number of distinct individuals visiting." },
  { metric_identifier: "traffic_visit_frequency", label: "Visit Frequency", category: "Traffic", higher_is_better: true, description: "Average number of visits per unique visitor." },
  { metric_identifier: "traffic_dwell_time", label: "Dwell Time (minutes)", category: "Traffic", higher_is_better: true, description: "Average duration of a visit." },

  // Trade Area
  { metric_identifier: "trade_area_size_sqmi", label: "Size (sq mi)", category: "Trade Area", higher_is_better: true, description: "Geographical size of the trade area." },
  { metric_identifier: "trade_area_population", label: "Population", category: "Trade Area", higher_is_better: true, description: "Total population within the trade area." },
  { metric_identifier: "trade_area_daytime_population", label: "Daytime Population", category: "Trade Area", higher_is_better: true, description: "Population present during daytime hours." },

  // Market Coverage & Saturation
  { 
    metric_identifier: "market_saturation_trade_area_overlap", 
    label: "Trade Area Overlap", 
    category: "Market Coverage & Saturation", 
    higher_is_better: true,
    description: "Measures overlap with competitor trade areas. (No Overlap = 100, Some = 50, Major = 0). Aim for less overlap (higher value)." 
  },
  { 
    metric_identifier: "market_saturation_heat_map_intersection", 
    label: "Heat Map Intersection", 
    category: "Market Coverage & Saturation", 
    higher_is_better: true,
    description: "Intersection with market hot spots. (Cold Spot = 100, Warm = 50, Hot Spot = 0). Aim for cold spots (higher value)."
  },
  
  // Demand & Spending
  { metric_identifier: "demand_supply_balance", label: "Supply/Demand Balance", category: "Demand & Spending", higher_is_better: true, description: "Balance between supply and demand. Positive demand = 100%, Negative demand = 0%." },
  { metric_identifier: "demand_supply_consumer_spending_index", label: "Consumer Spending Index", category: "Demand & Spending", higher_is_better: true, description: "Index representing consumer spending potential." },

  // Expenses
  { metric_identifier: "expenses_effective_wage", label: "Effective Wage ($/hr)", category: "Expenses", higher_is_better: false, description: "Average effective hourly wage." },
  { metric_identifier: "expenses_construction_cost_multiplier", label: "Construction Cost Multiplier", category: "Expenses", higher_is_better: false, description: "Multiplier for construction costs relative to a baseline." },

  // Financial Performance
  { metric_identifier: "financial_occupancy_rate", label: "Occupancy Rate (%)", category: "Financial Performance", higher_is_better: false, description: "Percentage of units/space occupied. Lower occupancy rate is considered better (e.g. lower cost of occupancy or higher vacancy desired)." },
  { metric_identifier: "financial_initial_investment", label: "Initial Investment ($)", category: "Financial Performance", higher_is_better: false, description: "Total initial capital required." },
  { metric_identifier: "financial_top_line_revenue", label: "Top-Line Revenue ($)", category: "Financial Performance", higher_is_better: true, description: "Total revenue generated." },
  { metric_identifier: "financial_profitability", label: "Profitability ($ or %)", category: "Financial Performance", higher_is_better: true, description: "Measure of profit." },
  { metric_identifier: "financial_payback_period_years", label: "Payback Period (years)", category: "Financial Performance", higher_is_better: false, description: "Time to recoup initial investment." },
];

export const nonEditableMetricIdentifiers: string[] = [
  "market_saturation_trade_area_overlap",
  "market_saturation_heat_map_intersection",
  "demand_supply_balance",
];

// Define the correct order for sections - required sections first, then optional, then special
export const SECTION_ORDER = [
  // Required sections (always shown first)
  "Traffic",
  "Trade Area",
  "Financial Performance",
  // Optional sections (user can toggle)
  "Market Coverage & Saturation",
  "Demand & Spending", 
  "Expenses",
  // Special sections
  "Visitor Profile",
  "Site Visit"
];

// Helper function to sort categories in the correct order
export const sortCategoriesByOrder = (categories: string[]): string[] => {
  return categories.sort((a, b) => {
    const indexA = SECTION_ORDER.indexOf(a);
    const indexB = SECTION_ORDER.indexOf(b);
    
    // If both categories are in the defined order, sort by their position
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }
    
    // If only one is in the defined order, prioritize it
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    
    // If neither is in the defined order, sort alphabetically
    return a.localeCompare(b);
  });
};

export function getDefaultMetricValue(metricIdentifier: string): UserCustomMetricSetting | undefined {
  const config = predefinedMetricsConfig.find(m => m.metric_identifier === metricIdentifier);
  if (config) {
    return {
      metric_identifier: config.metric_identifier,
      category: config.category,
      label: config.label,
      target_value: 0, // Default target value, user will set this
      higher_is_better: config.higher_is_better,
      measurement_type: null,
    };
  }
  return undefined;
}

// Helper functions for section management
export const getSectionType = (category: string): 'required' | 'optional' | 'special' => {
  if (isRequiredCategory(category)) return 'required';
  if (isOptionalCategory(category)) return 'optional';
  return 'special';
};

export const getSectionDisplayName = (category: string): string => {
  switch (category) {
    case VISITOR_PROFILE_CATEGORY:
      return 'Visitor Profile (Custom)';
    case SITE_VISIT_CATEGORY:
      return 'Site Visit (Always Included)';
    default:
      return category;
  }
};

export const getDefaultEnabledOptionalSections = (): string[] => {
  return [...OPTIONAL_METRIC_CATEGORIES];
};

// Filter categories based on enabled sections
export const getEnabledCategories = (enabledOptionalSections: string[]): string[] => {
  return [
    ...REQUIRED_METRIC_CATEGORIES,
    ...enabledOptionalSections.filter(section => OPTIONAL_METRIC_CATEGORIES.includes(section as any))
  ];
};

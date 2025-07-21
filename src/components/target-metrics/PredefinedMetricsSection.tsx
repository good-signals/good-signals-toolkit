
import React, { useState } from 'react';
import { Control, useFieldArray } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TargetMetricsFormData, REQUIRED_METRIC_CATEGORIES, OPTIONAL_METRIC_CATEGORIES, SITE_VISIT_CATEGORY, VISITOR_PROFILE_CATEGORY } from '@/types/targetMetrics';
import { sortCategoriesByOrder, getEnabledCategories } from '@/config/targetMetricsConfig';
import { CollapsibleMetricSection } from './CollapsibleMetricSection';

interface PredefinedMetricsSectionProps {
  control: Control<TargetMetricsFormData>;
  enabledSections?: string[];
  onSectionToggle?: (sectionName: string, enabled: boolean) => void;
}

const PredefinedMetricsSection: React.FC<PredefinedMetricsSectionProps> = ({
  control,
  enabledSections = [],
  onSectionToggle,
}) => {
  const { fields } = useFieldArray({
    control,
    name: "predefined_metrics",
  });

  // State to track which sections are expanded
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  // Get all categories that should be displayed
  const allCategories = [...REQUIRED_METRIC_CATEGORIES, ...OPTIONAL_METRIC_CATEGORIES];
  
  // Group metrics by category
  const metricsByCategory = fields.reduce((acc, metric, index) => {
    const category = metric.category;
    
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push({ ...metric, index });
    return acc;
  }, {} as Record<string, Array<any>>);

  // Get sorted categories that exist in the data
  const sortedCategories = sortCategoriesByOrder(allCategories);

  const handleToggleExpanded = (sectionName: string, expanded: boolean) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionName]: expanded
    }));
  };

  const handleToggleEnabled = (sectionName: string, enabled: boolean) => {
    if (onSectionToggle) {
      onSectionToggle(sectionName, enabled);
    }
  };

  const getSectionType = (category: string): 'required' | 'optional' | 'special' => {
    if (REQUIRED_METRIC_CATEGORIES.includes(category)) return 'required';
    if (category === VISITOR_PROFILE_CATEGORY || category === SITE_VISIT_CATEGORY) return 'special';
    return 'optional';
  };

  const isSectionEnabled = (category: string): boolean => {
    const sectionType = getSectionType(category);
    if (sectionType === 'required' || sectionType === 'special') return true;
    return enabledSections.includes(category);
  };

  if (allCategories.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Target Metrics</CardTitle>
          <CardDescription>
            Set your target values for each metric category
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>No predefined metrics are currently loaded.</p>
            <p className="text-sm mt-2">This can happen if you're starting from scratch and haven't selected any template, or if there was an issue loading the metrics.</p>
            <p className="text-sm">Try selecting a template or refreshing the page.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Target Metrics</CardTitle>
        <CardDescription>
          Set your target values for each metric category. Toggle sections on/off and expand/collapse as needed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {sortedCategories.map((category) => {
          const sectionType = getSectionType(category);
          const isEnabled = isSectionEnabled(category);
          const isExpanded = expandedSections[category] ?? (sectionType === 'required'); // Default required sections to expanded
          const categoryMetrics = metricsByCategory[category] || [];

          return (
            <CollapsibleMetricSection
              key={category}
              sectionName={category}
              sectionType={sectionType}
              isEnabled={isEnabled}
              isExpanded={isExpanded}
              onToggleEnabled={(enabled) => handleToggleEnabled(category, enabled)}
              onToggleExpanded={(expanded) => handleToggleExpanded(category, expanded)}
              metrics={categoryMetrics}
              control={control}
            />
          );
        })}

        <div className="text-xs text-muted-foreground pt-4 border-t">
          <p><strong>Required sections</strong> are always enabled and contain essential metrics.</p>
          <p><strong>Optional sections</strong> can be toggled on/off based on your needs.</p>
          <p><strong>Special sections</strong> like Site Visit contain no target metrics but are used for assessment ratings.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PredefinedMetricsSection;


import React, { useState } from 'react';
import { Control, useFieldArray } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { TargetMetricsFormData, REQUIRED_METRIC_CATEGORIES, OPTIONAL_METRIC_CATEGORIES, SITE_VISIT_CATEGORY, VISITOR_PROFILE_CATEGORY } from '@/types/targetMetrics';
import { sortCategoriesByOrder, getEnabledCategories } from '@/config/targetMetricsConfig';
import { getCustomSections } from '@/services/customMetricSectionsService';
import { CollapsibleMetricSection } from './CollapsibleMetricSection';
import VisitorProfileMetricsSection from './VisitorProfileMetricsSection';
import CustomMetricForm from './CustomMetricForm';

interface PredefinedMetricsSectionProps {
  control: Control<TargetMetricsFormData>;
  enabledSections?: string[];
  onSectionToggle?: (sectionName: string, enabled: boolean) => void;
  metricSetId?: string;
  accountId?: string;
  onAddCustomMetric?: () => void;
}

const PredefinedMetricsSection: React.FC<PredefinedMetricsSectionProps> = ({
  control,
  enabledSections = [],
  onSectionToggle,
  metricSetId,
  accountId,
  onAddCustomMetric,
}) => {
  const { fields } = useFieldArray({
    control,
    name: "predefined_metrics",
  });

  const { fields: customFields, append: appendCustom } = useFieldArray({
    control,
    name: "custom_metrics",
  });

  // State to track which sections are expanded
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [customMetricFormOpen, setCustomMetricFormOpen] = useState(false);
  const [preselectedSection, setPreselectedSection] = useState<string | null>(null);

  // Fetch custom sections from database using the passed accountId
  const { data: customSections = [] } = useQuery({
    queryKey: ['customSections', accountId],
    queryFn: () => accountId ? getCustomSections(accountId) : [],
    enabled: !!accountId,
  });

  // Get all categories that should be displayed (predefined + custom)
  const allPredefinedCategories = [...REQUIRED_METRIC_CATEGORIES, ...OPTIONAL_METRIC_CATEGORIES];
  const customSectionNames = customSections.map(section => section.name);
  const allCategories = [...allPredefinedCategories, ...customSectionNames];
  
  // Group predefined metrics by category
  const metricsByCategory = fields.reduce((acc, metric, index) => {
    const category = metric.category;
    
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push({ ...metric, index });
    return acc;
  }, {} as Record<string, Array<any>>);

  // Group custom metrics by category
  const customMetricsByCategory = customFields.reduce((acc, metric, index) => {
    const category = metric.category;
    
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push({ ...metric, index, isCustom: true });
    return acc;
  }, {} as Record<string, Array<any>>);

  // Get sorted predefined categories that exist in the data
  const sortedPredefinedCategories = sortCategoriesByOrder(allPredefinedCategories);
  
  // Get sorted custom sections
  const sortedCustomSections = customSections
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(section => section.name);

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

  const getSectionType = (category: string): 'required' | 'optional' | 'special' | 'custom' => {
    if (REQUIRED_METRIC_CATEGORIES.includes(category as any)) return 'required';
    if (category === VISITOR_PROFILE_CATEGORY || category === SITE_VISIT_CATEGORY) return 'special';
    if (customSectionNames.includes(category)) return 'custom';
    return 'optional';
  };

  const isSectionEnabled = (category: string): boolean => {
    const sectionType = getSectionType(category);
    if (sectionType === 'required' || sectionType === 'special') return true;
    return enabledSections.includes(category);
  };

  const handleAddMetricToSection = (sectionName: string) => {
    setPreselectedSection(sectionName);
    setCustomMetricFormOpen(true);
  };

  const handleCustomMetricSubmit = (data: any) => {
    const newMetric = {
      metric_identifier: `custom_${Date.now()}`,
      label: data.name,
      category: data.category,
      target_value: data.target_value,
      higher_is_better: data.higher_is_better,
      units: data.units,
      is_custom: true as const,
    };
    appendCustom(newMetric);
    setCustomMetricFormOpen(false);
    setPreselectedSection(null);
  };

  const isVisitorProfileEnabled = enabledSections.includes(VISITOR_PROFILE_CATEGORY);

  // Custom section component for rendering custom sections with toggle/collapse behavior
  const CustomSectionRenderer = ({ sectionName }: { sectionName: string }) => {
    const isEnabled = isSectionEnabled(sectionName);
    const isExpanded = expandedSections[sectionName] ?? false;
    const categoryMetrics = customMetricsByCategory[sectionName] || [];

    return (
      <Card className={!isEnabled ? "opacity-60" : ""}>
        <div className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleToggleExpanded(sectionName, !isExpanded)}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isEnabled && (isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />)}
                {!isEnabled && <ChevronRight className="h-4 w-4 opacity-50" />}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{sectionName}</span>
                    <Badge variant="secondary" className="text-xs">
                      Custom
                    </Badge>
                    {categoryMetrics.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {categoryMetrics.length} metric{categoryMetrics.length !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {onSectionToggle && (
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={(checked) => handleToggleEnabled(sectionName, checked)}
                    />
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
        </div>
        
        {isEnabled && isExpanded && (
          <CardContent className="space-y-4 pt-0">
            {categoryMetrics.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-lg">
                <p className="text-sm mb-3">No metrics in this section yet</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddMetricToSection(sectionName)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Metric
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {categoryMetrics.map((metric) => (
                  <div
                    key={metric.id || metric.index}
                    className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{metric.label}</span>
                        {metric.units && (
                          <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">
                            {metric.units}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Target: {metric.target_value} 
                        {metric.higher_is_better ? ' (higher is better)' : ' (lower is better)'}
                      </div>
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddMetricToSection(sectionName)}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Another Metric
                </Button>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    );
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
        {/* Global Add Custom Metric Button */}
        <div className="flex justify-end mb-4">
          <Button
            type="button"
            variant="outline"
            onClick={onAddCustomMetric}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Custom Metric
          </Button>
        </div>

        {/* Render predefined sections */}
        {sortedPredefinedCategories.map((category) => {
          const sectionType = getSectionType(category);
          const isEnabled = isSectionEnabled(category);
          const isExpanded = expandedSections[category] ?? (sectionType === 'required');
          const categoryMetrics = metricsByCategory[category] || [];

          // Insert Visitor Profile section after Financial Performance
          const shouldInsertVisitorProfile = category === "Financial Performance";

          return (
            <div key={category}>
              <CollapsibleMetricSection
                sectionName={category}
                sectionType={sectionType as 'required' | 'optional' | 'special'}
                isEnabled={isEnabled}
                isExpanded={isExpanded}
                onToggleEnabled={(enabled) => handleToggleEnabled(category, enabled)}
                onToggleExpanded={(expanded) => handleToggleExpanded(category, expanded)}
                metrics={categoryMetrics}
                control={control}
              />
              
              {shouldInsertVisitorProfile && (
                <div className="mt-4">
                  <VisitorProfileMetricsSection
                    control={control}
                    metricSetId={metricSetId}
                    isEnabled={isVisitorProfileEnabled}
                    onToggleEnabled={(enabled) => handleToggleEnabled(VISITOR_PROFILE_CATEGORY, enabled)}
                  />
                </div>
              )}
            </div>
          );
        })}

        {/* Render custom sections with the same behavior as predefined sections */}
        {sortedCustomSections.map((sectionName) => (
          <CustomSectionRenderer key={sectionName} sectionName={sectionName} />
        ))}

        <div className="text-xs text-muted-foreground pt-4 border-t">
          <p><strong>Required sections</strong> are always enabled and contain essential metrics.</p>
          <p><strong>Optional sections</strong> can be toggled on/off based on your needs.</p>
          <p><strong>Special sections</strong> like Site Visit contain no target metrics but are used for assessment ratings.</p>
          <p><strong>Custom sections</strong> are user-defined categories for business-specific metrics.</p>
        </div>
      </CardContent>

      <CustomMetricForm
        open={customMetricFormOpen}
        onOpenChange={setCustomMetricFormOpen}
        onSubmit={handleCustomMetricSubmit}
        initialData={preselectedSection ? { category: preselectedSection } : undefined}
        isEditing={false}
      />
    </Card>
  );
};

export default PredefinedMetricsSection;


import React from 'react';
import { Control } from 'react-hook-form';
import { ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TargetMetricsFormData } from '@/types/targetMetrics';
import { getSectionDisplayName } from '@/config/targetMetricsConfig';
import { metricDropdownOptions, specificDropdownMetrics } from '@/config/metricDisplayConfig';

interface CollapsibleMetricSectionProps {
  sectionName: string;
  sectionType: 'required' | 'optional' | 'special';
  isEnabled: boolean;
  isExpanded: boolean;
  onToggleEnabled: (enabled: boolean) => void;
  onToggleExpanded: (expanded: boolean) => void;
  metrics: Array<any>;
  control: Control<TargetMetricsFormData>;
  disabled?: boolean;
}

export const CollapsibleMetricSection: React.FC<CollapsibleMetricSectionProps> = ({
  sectionName,
  sectionType,
  isEnabled,
  isExpanded,
  onToggleEnabled,
  onToggleExpanded,
  metrics,
  control,
  disabled = false,
}) => {
  const getBadgeVariant = (type: string) => {
    switch (type) {
      case 'required':
        return 'default';
      case 'optional':
        return 'secondary';
      case 'special':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getBadgeLabel = (type: string) => {
    switch (type) {
      case 'required':
        return 'Required';
      case 'optional':
        return 'Optional';
      case 'special':
        return 'Special';
      default:
        return '';
    }
  };

  const getSectionDescription = (section: string): string => {
    switch (section) {
      case 'Market Coverage & Saturation':
        return 'Analyze competitor overlap and market positioning';
      case 'Demand & Spending':
        return 'Evaluate market demand and consumer spending patterns';
      case 'Expenses':
        return 'Track operational costs and construction expenses';
      default:
        return '';
    }
  };

  const isDisabled = disabled || (sectionType === 'required' || sectionType === 'special');

  return (
    <Collapsible open={isEnabled ? isExpanded : false} onOpenChange={onToggleExpanded}>
      <div className={`border rounded-lg ${!isEnabled ? 'bg-muted/30 opacity-70' : 'bg-card'}`}>
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-3 flex-1">
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex items-center space-x-2 hover:text-primary transition-colors"
                disabled={!isEnabled}
              >
                <ChevronDown 
                  className={`h-4 w-4 transition-transform ${isEnabled && isExpanded ? 'rotate-0' : '-rotate-90'}`}
                />
                <Label className="cursor-pointer font-medium">
                  {getSectionDisplayName(sectionName)}
                </Label>
              </button>
            </CollapsibleTrigger>
            
            <Badge variant={getBadgeVariant(sectionType)}>
              {getBadgeLabel(sectionType)}
            </Badge>
            
            {metrics.length > 0 && (
              <span className="text-sm text-muted-foreground">
                ({metrics.length} metric{metrics.length !== 1 ? 's' : ''})
              </span>
            )}
          </div>
          
          <Switch
            checked={isEnabled}
            onCheckedChange={onToggleEnabled}
            disabled={isDisabled}
            className={isDisabled ? 'opacity-50' : ''}
          />
        </div>

        <CollapsibleContent>
          <div className="p-4">
            {sectionType === 'optional' && (
              <p className="text-sm text-muted-foreground mb-4">
                {getSectionDescription(sectionName)}
              </p>
            )}
            
            <div className="space-y-4">
              {metrics.map((metric) => {
                const isDropdownMetric = specificDropdownMetrics.includes(metric.metric_identifier);
                const dropdownOptions = metricDropdownOptions[metric.metric_identifier] || [];

                return (
                  <div
                    key={metric.metric_identifier}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg bg-card"
                  >
                    <div className="sm:w-2/3 mb-2 sm:mb-0">
                      <FormLabel className="text-base font-medium">
                        {metric.label}
                      </FormLabel>
                      <div className="text-sm text-muted-foreground mt-1">
                        {metric.higher_is_better ? "(Higher is better)" : "(Lower is better)"}
                      </div>
                    </div>
                    
                    <div className="sm:w-1/3">
                      <FormField
                        control={control}
                        name={`predefined_metrics.${metric.index}.target_value`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              {isDropdownMetric ? (
                                <Select
                                  onValueChange={(value) => field.onChange(parseFloat(value))}
                                  value={String(field.value || '')}
                                  disabled={!isEnabled}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select target" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {dropdownOptions.map(option => (
                                      <SelectItem key={option.value} value={String(option.value)}>
                                        {option.label} ({option.value})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Input
                                  type="number"
                                  placeholder="Enter target value"
                                  {...field}
                                  onChange={e => {
                                    const value = e.target.value;
                                    if (value === '' || value === null) {
                                      field.onChange(undefined);
                                    } else {
                                      const parsed = parseFloat(value);
                                      field.onChange(isNaN(parsed) ? undefined : parsed);
                                    }
                                  }}
                                  disabled={!isEnabled}
                                />
                              )}
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

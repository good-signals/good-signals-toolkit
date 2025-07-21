import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  REQUIRED_METRIC_CATEGORIES, 
  OPTIONAL_METRIC_CATEGORIES,
  SITE_VISIT_CATEGORY,
  VISITOR_PROFILE_CATEGORY
} from '@/types/targetMetrics';
import { 
  getSectionType,
  getSectionDisplayName
} from '@/config/targetMetricsConfig';

interface OptionalSectionToggleProps {
  enabledSections: string[];
  onSectionToggle: (sectionName: string, enabled: boolean) => void;
  className?: string;
}

export const OptionalSectionToggle: React.FC<OptionalSectionToggleProps> = ({
  enabledSections,
  onSectionToggle,
  className
}) => {
  const handleToggle = (sectionName: string, enabled: boolean) => {
    onSectionToggle(sectionName, enabled);
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

  const getBadgeVariant = (sectionType: string) => {
    switch (sectionType) {
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

  const getBadgeLabel = (sectionType: string) => {
    switch (sectionType) {
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

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Target Metrics Sections</CardTitle>
        <CardDescription>
          Configure which optional sections to include in your target metrics set
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Required Sections */}
        <div>
          <h4 className="text-sm font-medium mb-3 text-muted-foreground">Required Sections</h4>
          <div className="space-y-3">
            {REQUIRED_METRIC_CATEGORIES.map((section) => (
              <div key={section} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                <div className="flex items-center space-x-3">
                  <Label htmlFor={`section-${section}`} className="flex-1 cursor-default">
                    {getSectionDisplayName(section)}
                  </Label>
                  <Badge variant={getBadgeVariant('required')}>
                    {getBadgeLabel('required')}
                  </Badge>
                </div>
                <Switch
                  id={`section-${section}`}
                  checked={true}
                  disabled={true}
                  className="opacity-50"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Optional Sections */}
        <div>
          <h4 className="text-sm font-medium mb-3 text-muted-foreground">Optional Sections</h4>
          <div className="space-y-3">
            {OPTIONAL_METRIC_CATEGORIES.map((section) => (
              <div key={section} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-1">
                    <Label htmlFor={`section-${section}`} className="cursor-pointer">
                      {getSectionDisplayName(section)}
                    </Label>
                    <Badge variant={getBadgeVariant('optional')}>
                      {getBadgeLabel('optional')}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {getSectionDescription(section)}
                  </p>
                </div>
                <Switch
                  id={`section-${section}`}
                  checked={enabledSections.includes(section)}
                  onCheckedChange={(checked) => handleToggle(section, checked)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Special Sections */}
        <div>
          <h4 className="text-sm font-medium mb-3 text-muted-foreground">Special Sections</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
              <div className="flex items-center space-x-3">
                <Label className="flex-1 cursor-default">
                  {getSectionDisplayName(VISITOR_PROFILE_CATEGORY)}
                </Label>
                <Badge variant={getBadgeVariant('special')}>
                  Custom
                </Badge>
              </div>
              <Switch
                checked={true}
                disabled={true}
                className="opacity-50"
              />
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
              <div className="flex items-center space-x-3">
                <Label className="flex-1 cursor-default">
                  {getSectionDisplayName(SITE_VISIT_CATEGORY)}
                </Label>
                <Badge variant={getBadgeVariant('special')}>
                  Always Included
                </Badge>
              </div>
              <Switch
                checked={true}
                disabled={true}
                className="opacity-50"
              />
            </div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground pt-2 border-t">
          <p><strong>Required sections</strong> are always included and cannot be disabled.</p>
          <p><strong>Optional sections</strong> can be toggled on/off based on your needs.</p>
          <p><strong>Site Visit</strong> is always included for assessment ratings but contains no target metrics.</p>
        </div>
      </CardContent>
    </Card>
  );
};
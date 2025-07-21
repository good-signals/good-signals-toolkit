
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Plus, Target } from 'lucide-react';
import { getStandardMetricSets, getStandardMetricSettings } from '@/services/standardMetricsService';
import { StandardTargetMetricSet } from '@/types/standardMetrics';

interface TemplateOption {
  id: string;
  name: string;
  description: string;
  isCustom: boolean;
  metricCount?: number;
  categories?: string[];
}

interface TemplateSelectionStepProps {
  onTemplateSelect: (templateId: string | null) => void;
  selectedTemplateId: string | null;
}

export const TemplateSelectionStep: React.FC<TemplateSelectionStepProps> = ({
  onTemplateSelect,
  selectedTemplateId,
}) => {
  const { data: standardSets, isLoading } = useQuery({
    queryKey: ['standardMetricSets'],
    queryFn: getStandardMetricSets,
  });

  const { data: templateMetrics } = useQuery({
    queryKey: ['templateMetrics', selectedTemplateId],
    queryFn: () => selectedTemplateId ? getStandardMetricSettings(selectedTemplateId) : null,
    enabled: !!selectedTemplateId,
  });

  const createTemplateOptions = (sets: StandardTargetMetricSet[]): TemplateOption[] => {
    const options: TemplateOption[] = [
      {
        id: 'scratch',
        name: 'Start from Scratch',
        description: 'Create a completely custom metric set with empty fields',
        isCustom: true,
      },
    ];

    sets.forEach(set => {
      options.push({
        id: set.id,
        name: set.name,
        description: set.description || 'Standard metric template',
        isCustom: false,
      });
    });

    return options;
  };

  const templateOptions = standardSets ? createTemplateOptions(standardSets) : [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Choose a Template</h2>
          <p className="text-muted-foreground">
            Select a starting point for your target metrics set
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Choose a Template</h2>
        <p className="text-muted-foreground">
          Select a starting point for your target metrics set
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templateOptions.map((template) => (
          <Card
            key={template.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedTemplateId === template.id
                ? 'ring-2 ring-primary border-primary'
                : 'hover:border-primary/50'
            }`}
            onClick={() => onTemplateSelect(template.id === 'scratch' ? null : template.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {template.isCustom ? (
                    <Plus className="h-5 w-5 text-primary" />
                  ) : (
                    <Target className="h-5 w-5 text-primary" />
                  )}
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                </div>
                {selectedTemplateId === template.id && (
                  <Badge variant="default">Selected</Badge>
                )}
              </div>
              <CardDescription className="text-sm">
                {template.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {template.isCustom ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>Build your own metric set</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span>Pre-configured metrics</span>
                  </div>
                  {selectedTemplateId === template.id && templateMetrics && (
                    <div className="text-xs text-muted-foreground">
                      {templateMetrics.length} metrics available
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedTemplateId && templateMetrics && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Template Preview</CardTitle>
            <CardDescription>
              This template includes {templateMetrics.length} pre-configured metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(
                templateMetrics.reduce((acc, metric) => {
                  acc[metric.category] = (acc[metric.category] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>)
              ).map(([category, count]) => (
                <div key={category} className="flex justify-between text-sm">
                  <span className="font-medium">{category}</span>
                  <Badge variant="secondary">{count} metrics</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

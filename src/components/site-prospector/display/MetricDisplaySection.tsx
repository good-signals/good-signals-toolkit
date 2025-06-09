
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import MetricDisplayField from './MetricDisplayField';

interface MetricDisplaySectionProps {
  categoryName: string;
  categoryDescription: string;
  categoryMetrics: Array<{
    id: string;
    metric_identifier: string;
    label: string;
    category: string;
    entered_value: number | null;
    notes?: string | null;
    target_value?: number;
    higher_is_better?: boolean;
    measurement_type?: string | null;
  }>;
}

const MetricDisplaySection: React.FC<MetricDisplaySectionProps> = ({
  categoryName,
  categoryDescription,
  categoryMetrics,
}) => {
  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{categoryName}</span>
          <Badge variant="secondary">{categoryDescription}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {/* Column Headers */}
        <div className="grid grid-cols-5 gap-4 pb-3 border-b border-border mb-4">
          <div className="font-medium text-muted-foreground">Metric</div>
          <div className="font-medium text-muted-foreground">Entered Value</div>
          <div className="font-medium text-muted-foreground">Target Value</div>
          <div className="font-medium text-muted-foreground">Signal Score</div>
          <div className="font-medium text-muted-foreground">Notes</div>
        </div>
        
        {/* Metric Rows */}
        <div>
          {categoryMetrics.map((metric) => (
            <MetricDisplayField
              key={metric.id}
              metricField={metric}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default MetricDisplaySection;


import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import MetricInputField from './metric-input/MetricInputField';
import CategoryImageUpload from './metric-input/CategoryImageUpload';
import { Account } from '@/services/account';

interface MetricCategorySectionProps {
  categoryName: string;
  categoryDescription: string;
  categoryMetrics: { [key: string]: any };
  onMetricChange: (metricKey: string, value: any) => void;
  onImageUpload: (imageFile: File) => void;
  account: Account | null;
}

const MetricCategorySection: React.FC<MetricCategorySectionProps> = ({
  categoryName,
  categoryDescription,
  categoryMetrics,
  onMetricChange,
  onImageUpload,
  account,
}) => {
  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>{categoryName}</CardTitle>
        <Badge>{categoryDescription}</Badge>
      </CardHeader>
      <CardContent className="grid gap-4">
        {Object.entries(categoryMetrics).map(([metricKey, metricValue]) => (
          <MetricInputField
            key={metricKey}
            metricKey={metricKey}
            metricValue={metricValue}
            onMetricChange={onMetricChange}
          />
        ))}
        <CategoryImageUpload 
          category={categoryName}
          imageMetricIndex={0}
          control={null}
          watch={() => null}
          setValue={() => {}}
          disabled={false}
        />
      </CardContent>
    </Card>
  );
};

export default MetricCategorySection;

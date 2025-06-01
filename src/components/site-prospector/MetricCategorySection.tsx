
import React from 'react';
import { Tag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from "@/components/ui/badge";
import { Account } from '@/services/accountService';
import { SignalStatus, getSignalStatus } from '@/lib/assessmentDisplayUtils';

export interface ProcessedMetric {
  label: string;
  enteredValue: string;
  targetValue: string;
  score: number | null;
  metricScoreStatus: SignalStatus;
  notes: string | null;
}

interface MetricCategorySectionProps {
  category: string;
  metricsForCategory: ProcessedMetric[];
  categoryImage?: string | null;
  accountSettings: Account | null;
}

const MetricCategorySection: React.FC<MetricCategorySectionProps> = ({
  category,
  metricsForCategory,
  categoryImage,
  accountSettings,
}) => {
  if (metricsForCategory.length === 0) return null;

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold flex items-center">
          <Tag className="h-6 w-6 mr-2 text-primary" />
          {category}
        </CardTitle>
        {categoryImage && (
          <CardDescription>Optional image for this section:</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {categoryImage && (
          <div className="mb-6">
            <img src={categoryImage} alt={`${category} section image`} className="rounded-md max-h-80 w-auto object-contain border" />
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[30%]">Metric</TableHead>
              <TableHead className="text-center">Entered Value</TableHead>
              <TableHead className="text-center">Target Value</TableHead>
              <TableHead className="text-center">Signal Score</TableHead>
              <TableHead className="w-[30%]">Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {metricsForCategory.map(metric => {
                const individualMetricStatus = getSignalStatus(
                    metric.score ?? null,
                    0.75, // Default good threshold
                    0.50  // Default bad threshold
                );
              return (
                <TableRow key={metric.label}>
                  <TableCell className="font-medium">{metric.label}</TableCell>
                  <TableCell className="text-center">{metric.enteredValue}</TableCell>
                  <TableCell className="text-center">{metric.targetValue}</TableCell>
                  <TableCell className="text-center">
                    {typeof metric.score === 'number'
                      ? <Badge
                          variant="outline"
                          className={`${individualMetricStatus.color} ${individualMetricStatus.color.replace('text-', 'border-')}`}
                        >
                          {metric.score.toFixed(0)}%
                        </Badge>
                      : <Badge variant="outline">{individualMetricStatus.text}</Badge>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{metric.notes || '-'}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default MetricCategorySection;

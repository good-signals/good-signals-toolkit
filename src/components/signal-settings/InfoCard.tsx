
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const InfoCard: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>How Signal Thresholds Work</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p>
          <strong>Good Threshold:</strong> Sites with signal scores at or above this percentage are considered to have "Good" signals.
        </p>
        <p>
          <strong>Bad Threshold:</strong> Sites with signal scores at or below this percentage are considered to have "Bad" signals.
        </p>
        <p>
          <strong>Neutral:</strong> Sites with scores between the bad and good thresholds are considered "Neutral."
        </p>
        <p className="text-amber-600">
          <strong>Note:</strong> Changing these thresholds will immediately affect how scores are displayed throughout your account, including in assessments, reports, and the territory targeter.
        </p>
      </CardContent>
    </Card>
  );
};

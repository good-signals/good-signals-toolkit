
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface SignalPreviewProps {
  goodThreshold: number;
  badThreshold: number;
}

export const SignalPreview: React.FC<SignalPreviewProps> = ({
  goodThreshold,
  badThreshold,
}) => {
  const getScorePreview = (score: number) => {
    if (score >= goodThreshold) {
      return { status: 'Good', color: 'bg-green-500', icon: CheckCircle };
    } else if (score <= badThreshold) {
      return { status: 'Bad', color: 'bg-red-500', icon: AlertTriangle };
    } else {
      return { status: 'Neutral', color: 'bg-yellow-500', icon: Clock };
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Signal Score Preview</CardTitle>
        <CardDescription>
          See how different scores would be categorized with your current thresholds.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[25, 45, 65, 85].map((score) => {
            const preview = getScorePreview(score);
            const Icon = preview.icon;
            return (
              <div key={score} className="text-center space-y-2">
                <div className="text-2xl font-bold">{score}%</div>
                <Badge 
                  variant="secondary" 
                  className={`${preview.color} text-white flex items-center gap-1 justify-center`}
                >
                  <Icon className="h-3 w-3" />
                  {preview.status}
                </Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

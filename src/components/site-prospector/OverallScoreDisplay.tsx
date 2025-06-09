import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Account } from '@/services/account';

interface OverallScoreDisplayProps {
  overallScore: number | null;
  scoreChange: number | null;
}

const OverallScoreDisplay: React.FC<OverallScoreDisplayProps> = ({ overallScore, scoreChange }) => {
  const percentage = overallScore !== null ? Math.max(0, Math.min(overallScore, 100)) : 0;

  let trendingIcon = null;
  let trendingText = '';

  if (scoreChange !== null) {
    if (scoreChange > 0) {
      trendingIcon = <TrendingUp className="h-4 w-4 text-green-500 ml-1" />;
      trendingText = `Increased by ${scoreChange.toFixed(1)} points`;
    } else if (scoreChange < 0) {
      trendingIcon = <TrendingDown className="h-4 w-4 text-red-500 ml-1" />;
      trendingText = `Decreased by ${Math.abs(scoreChange).toFixed(1)} points`;
    } else {
      trendingIcon = <Minus className="h-4 w-4 text-gray-500 ml-1" />;
      trendingText = 'No change';
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Overall Site Signal Score</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold">{overallScore !== null ? overallScore.toFixed(0) : 'N/A'}</div>
          {trendingIcon && (
            <div className="text-sm text-muted-foreground flex items-center">
              {trendingText}
              {trendingIcon}
            </div>
          )}
        </div>
        <Progress value={percentage} className="mt-2" />
      </CardContent>
    </Card>
  );
};

export default OverallScoreDisplay;

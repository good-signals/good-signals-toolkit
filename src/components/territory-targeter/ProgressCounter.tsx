
import React, { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { Loader2 } from 'lucide-react';

interface ProgressCounterProps {
  isActive: boolean;
  duration?: number; // Duration in seconds
  onComplete?: () => void;
}

const ProgressCounter: React.FC<ProgressCounterProps> = ({ 
  isActive, 
  duration = 30,
  onComplete 
}) => {
  const [progress, setProgress] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);

  useEffect(() => {
    if (!isActive) {
      setProgress(0);
      setTimeElapsed(0);
      return;
    }

    const interval = setInterval(() => {
      setTimeElapsed(prev => {
        const newTime = prev + 1;
        const newProgress = Math.min((newTime / duration) * 100, 95); // Cap at 95% until actual completion
        setProgress(newProgress);
        
        if (newTime >= duration && onComplete) {
          onComplete();
        }
        
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, duration, onComplete]);

  // Complete the progress when isActive becomes false (scoring finished)
  useEffect(() => {
    if (!isActive && progress > 0) {
      setProgress(100);
      // Reset after a short delay to show completion
      const resetTimeout = setTimeout(() => {
        setProgress(0);
        setTimeElapsed(0);
      }, 1000);
      
      return () => clearTimeout(resetTimeout);
    }
  }, [isActive, progress]);

  if (!isActive && progress === 0) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
  };

  const isCompleted = !isActive && progress === 100;

  return (
    <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
      <div className="flex items-center gap-3">
        {isCompleted ? (
          <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center">
            <div className="h-2 w-2 bg-white rounded-full"></div>
          </div>
        ) : (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        )}
        <div className="flex-1">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">
              {isCompleted ? 'Analysis complete!' : 'AI analyzing markets...'}
            </span>
            <span className="text-sm text-muted-foreground">
              {formatTime(timeElapsed)}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>
      <div className="text-xs text-muted-foreground">
        {isCompleted 
          ? 'Market scores have been generated and added to the table below.'
          : 'Perplexity AI is researching and scoring each market based on your criteria. This typically takes 15-30 seconds.'
        }
      </div>
    </div>
  );
};

export default ProgressCounter;

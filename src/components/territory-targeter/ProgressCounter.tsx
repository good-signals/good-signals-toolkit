
import React, { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { Loader2, Clock, Zap } from 'lucide-react';

interface ProgressCounterProps {
  isActive: boolean;
  duration?: number;
  startTime?: number | null;
  analysisMode?: 'fast' | 'detailed';
  onComplete?: () => void;
}

const ProgressCounter: React.FC<ProgressCounterProps> = ({ 
  isActive, 
  duration = 60,
  startTime,
  analysisMode = 'fast',
  onComplete 
}) => {
  const [progress, setProgress] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);

  useEffect(() => {
    console.log('ProgressCounter: isActive changed to', isActive, 'startTime:', startTime);
    
    if (!isActive) {
      // Complete the progress smoothly
      if (progress > 0 && progress < 100) {
        setProgress(100);
        setTimeout(() => {
          setProgress(0);
          setTimeElapsed(0);
        }, 1000);
      } else {
        setProgress(0);
        setTimeElapsed(0);
      }
      return;
    }

    // Calculate initial elapsed time if resuming
    let initialElapsed = 0;
    if (startTime) {
      initialElapsed = Math.floor((Date.now() - startTime) / 1000);
      setTimeElapsed(initialElapsed);
      
      // Calculate initial progress
      const initialProgress = Math.min((initialElapsed / duration) * 100, 95);
      setProgress(initialProgress);
      console.log('ProgressCounter: Initial progress:', initialProgress);
    }

    const interval = setInterval(() => {
      setTimeElapsed(prev => {
        const newTime = prev + 1;
        // Cap progress at 95% until actual completion to avoid user confusion
        const newProgress = Math.min((newTime / duration) * 100, 95);
        setProgress(newProgress);
        
        // Don't auto-complete to avoid conflicts with analysis logic
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, duration, startTime]);

  if (!isActive && progress === 0) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
  };

  const getEstimatedRemaining = () => {
    if (timeElapsed >= duration) return 'Finishing up...';
    const remaining = duration - timeElapsed;
    return formatTime(remaining);
  };

  const isCompleted = !isActive && progress === 100;
  const isOvertime = timeElapsed > duration && isActive;

  const getStatusText = () => {
    if (isCompleted) return 'Analysis complete!';
    if (isOvertime) return 'Analysis taking longer than expected...';
    return `AI analyzing markets (${analysisMode} mode)...`;
  };

  const getDescriptionText = () => {
    if (isCompleted) {
      return 'Market scores have been generated and added to the table below.';
    }
    if (isOvertime) {
      return 'Complex analyses can take longer than estimated. Your analysis is still running and will complete soon.';
    }
    
    const timeInfo = analysisMode === 'fast' 
      ? 'This typically takes 1-3 minutes'
      : 'This typically takes 3-8 minutes';
    
    return `Perplexity AI is researching and scoring each market based on your criteria. ${timeInfo}. Estimated remaining: ${getEstimatedRemaining()}.`;
  };

  return (
    <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
      <div className="flex items-center gap-3">
        {isCompleted ? (
          <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center">
            <div className="h-2 w-2 bg-white rounded-full"></div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            {analysisMode === 'fast' ? (
              <Zap className="h-4 w-4 text-yellow-500" />
            ) : (
              <Clock className="h-4 w-4 text-blue-500" />
            )}
          </div>
        )}
        <div className="flex-1">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">
              {getStatusText()}
            </span>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{formatTime(timeElapsed)}</span>
              {!isCompleted && !isOvertime && (
                <span className="text-xs">/ ~{formatTime(duration)}</span>
              )}
            </div>
          </div>
          <Progress 
            value={progress} 
            className={`h-2 ${isOvertime ? 'opacity-75' : ''}`} 
          />
          {isOvertime && (
            <div className="mt-1 text-xs text-yellow-600">
              Taking longer than expected...
            </div>
          )}
        </div>
      </div>
      <div className="text-xs text-muted-foreground">
        {getDescriptionText()}
      </div>
    </div>
  );
};

export default ProgressCounter;

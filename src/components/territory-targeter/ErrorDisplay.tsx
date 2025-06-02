
import React from 'react';

interface ErrorDisplayProps {
  error: string | null;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error }) => {
  if (!error) return null;

  return (
    <div className="mt-6 p-4 border border-destructive/50 bg-destructive/10 text-destructive rounded-lg">
      <h4 className="font-medium mb-2">Analysis Error</h4>
      <p className="text-sm">{error}</p>
    </div>
  );
};

export default ErrorDisplay;

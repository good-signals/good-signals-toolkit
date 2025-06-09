
import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ValidationErrorProps {
  error: string;
}

const ValidationError: React.FC<ValidationErrorProps> = ({ error }) => {
  return (
    <div className="flex items-center space-x-2 text-sm text-destructive">
      <AlertCircle className="h-4 w-4" />
      <span>{error}</span>
    </div>
  );
};

export default ValidationError;

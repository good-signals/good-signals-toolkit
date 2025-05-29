
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface TerritoryNoticesProps {
  user: any;
  cbsaDataLength: number;
}

const TerritoryNotices: React.FC<TerritoryNoticesProps> = ({
  user,
  cbsaDataLength
}) => {
  return (
    <>
      {/* CBSA Data Info */}
      <div className="mb-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Currently showing top {cbsaDataLength} U.S. CBSAs by population. You can upload your own CBSA dataset to replace this sample data.
          </AlertDescription>
        </Alert>
      </div>

      {/* Authentication Notice */}
      {!user && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please sign in to use the Territory Targeter tool.
          </AlertDescription>
        </Alert>
      )}
    </>
  );
};

export default TerritoryNotices;

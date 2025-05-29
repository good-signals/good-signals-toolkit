
import React from 'react';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import TerritoryTargeterPageContent from '@/components/territory-targeter/TerritoryTargeterPageContent';

const TerritoryTargeterPage = () => {
  return (
    <ErrorBoundary>
      <TerritoryTargeterPageContent />
    </ErrorBoundary>
  );
};

export default TerritoryTargeterPage;

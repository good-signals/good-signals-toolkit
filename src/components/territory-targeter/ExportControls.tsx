
import React from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ExportControlsProps {
  onClearAnalysis: () => void;
  onExportCSV: () => void;
  onExportExcel: () => void;
}

const ExportControls: React.FC<ExportControlsProps> = ({
  onClearAnalysis,
  onExportCSV,
  onExportExcel
}) => {
  return (
    <div className="flex justify-end gap-2 mb-6">
      <Button onClick={onClearAnalysis} variant="outline">
        Clear Analysis
      </Button>
      <Button onClick={onExportCSV} variant="outline">
        <Download className="mr-2 h-4 w-4" />
        Export CSV
      </Button>
      <Button onClick={onExportExcel} variant="outline">
        <Download className="mr-2 h-4 w-4" />
        Export Excel
      </Button>
    </div>
  );
};

export default ExportControls;

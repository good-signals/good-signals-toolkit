
import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ClearAnalysisDialog from './ClearAnalysisDialog';

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
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);

  const handleClearClick = () => {
    setIsClearDialogOpen(true);
  };

  const handleConfirmClear = () => {
    onClearAnalysis();
  };

  return (
    <>
      <div className="flex justify-end gap-2 mb-6">
        <Button onClick={handleClearClick} variant="outline">
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

      <ClearAnalysisDialog
        isOpen={isClearDialogOpen}
        onClose={() => setIsClearDialogOpen(false)}
        onConfirm={handleConfirmClear}
      />
    </>
  );
};

export default ExportControls;

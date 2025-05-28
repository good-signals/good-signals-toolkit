
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import ExportOptionsDialog from './ExportOptionsDialog';
import { ExportData, ExportOptions } from '@/services/exportService';

interface ExportButtonProps {
  exportData: ExportData;
  disabled?: boolean;
}

const ExportButton: React.FC<ExportButtonProps> = ({ exportData, disabled = false }) => {
  const [showOptionsDialog, setShowOptionsDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportClick = () => {
    setShowOptionsDialog(true);
  };

  const handleExportStart = () => {
    setIsExporting(true);
  };

  const handleExportComplete = () => {
    setIsExporting(false);
    setShowOptionsDialog(false);
  };

  return (
    <>
      <Button 
        onClick={handleExportClick} 
        disabled={disabled || isExporting}
        variant="outline"
      >
        {isExporting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <FileDown className="mr-2 h-4 w-4" />
        )}
        Export Assessment
      </Button>
      
      <ExportOptionsDialog
        open={showOptionsDialog}
        onOpenChange={setShowOptionsDialog}
        exportData={exportData}
        onExportStart={handleExportStart}
        onExportComplete={handleExportComplete}
      />
    </>
  );
};

export default ExportButton;

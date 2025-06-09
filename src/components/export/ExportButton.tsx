
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import ExportOptionsDialog from './ExportOptionsDialog';
import { ExportData, ExportOptions } from '@/services/exportService';
import { EnhancedExportData, exportEnhancedSiteAssessmentToPDF } from '@/services/enhancedExportService';
import { triggerAssessmentRecalculation } from '@/services/targetMetricsService';
import { useAuth } from '@/contexts/AuthContext';

interface ExportButtonProps {
  exportData: ExportData | EnhancedExportData;
  disabled?: boolean;
}

const ExportButton: React.FC<ExportButtonProps> = ({ exportData, disabled = false }) => {
  const [showOptionsDialog, setShowOptionsDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const { user } = useAuth();

  const handleRecalculateScores = async () => {
    if (!user || !exportData.targetMetricSet?.id) {
      toast({
        title: "Error",
        description: "Cannot recalculate scores: missing user or target metric set",
        variant: "destructive",
      });
      return;
    }

    setIsRecalculating(true);
    
    try {
      const result = await triggerAssessmentRecalculation(
        exportData.targetMetricSet.id,
        user.id
      );

      if (result.success) {
        toast({
          title: "Scores Updated",
          description: result.message,
        });
      } else {
        toast({
          title: "Recalculation Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error recalculating scores:', error);
      toast({
        title: "Error",
        description: "Failed to recalculate assessment scores",
        variant: "destructive",
      });
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleExportClick = async () => {
    try {
      setIsExporting(true);

      // Use the enhanced export service directly with default options
      await exportEnhancedSiteAssessmentToPDF(exportData as EnhancedExportData, {
        includeImages: true,
        pageOrientation: 'portrait',
        imageQuality: 'medium'
      });

      toast({
        title: "Export Successful",
        description: "Your site assessment has been exported as a PDF.",
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: "Export Failed",
        description: "There was an error exporting your assessment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button 
      onClick={handleExportClick} 
      disabled={disabled || isExporting || isRecalculating}
      variant="outline"
    >
      {isExporting ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <FileDown className="mr-2 h-4 w-4" />
      )}
      Export Assessment
    </Button>
  );
};

export default ExportButton;

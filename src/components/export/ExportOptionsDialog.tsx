
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, FileDown } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ExportData, ExportOptions, exportAssessmentToPDF } from '@/services/exportService';

interface ExportOptionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exportData: ExportData;
  onExportStart: () => void;
  onExportComplete: () => void;
}

const ExportOptionsDialog: React.FC<ExportOptionsDialogProps> = ({
  open,
  onOpenChange,
  exportData,
  onExportStart,
  onExportComplete,
}) => {
  const [options, setOptions] = useState<ExportOptions>({
    includeImages: true,
    pageOrientation: 'portrait',
    imageQuality: 'medium',
  });
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      onExportStart();

      await exportAssessmentToPDF(exportData, options);

      toast({
        title: "Export Successful",
        description: "Your site assessment has been exported as a PDF.",
      });

      onExportComplete();
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: "Export Failed",
        description: "There was an error exporting your assessment. Please try again.",
        variant: "destructive",
      });
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Export Assessment</DialogTitle>
          <DialogDescription>
            Configure your export options for the site assessment PDF.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="include-images" className="text-sm font-medium">
              Include Images
            </Label>
            <Switch
              id="include-images"
              checked={options.includeImages}
              onCheckedChange={(checked) =>
                setOptions(prev => ({ ...prev, includeImages: checked }))
              }
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="orientation" className="text-sm font-medium">
                Page Orientation
              </Label>
              <Select
                value={options.pageOrientation}
                onValueChange={(value: 'portrait' | 'landscape') =>
                  setOptions(prev => ({ ...prev, pageOrientation: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="portrait">Portrait</SelectItem>
                  <SelectItem value="landscape">Landscape</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="image-quality" className="text-sm font-medium">
                Image Quality
              </Label>
              <Select
                value={options.imageQuality}
                onValueChange={(value: 'high' | 'medium' | 'low') =>
                  setOptions(prev => ({ ...prev, imageQuality: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="mr-2 h-4 w-4" />
            )}
            Export PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExportOptionsDialog;

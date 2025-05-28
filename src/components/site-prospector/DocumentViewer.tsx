
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Download, ExternalLink } from 'lucide-react';
import { AssessmentDocument, getDocumentDownloadUrl } from '@/services/documentService';
import { useToast } from '@/components/ui/use-toast';

interface DocumentViewerProps {
  document: AssessmentDocument | null;
  isOpen: boolean;
  onClose: () => void;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({ document, isOpen, onClose }) => {
  const { toast } = useToast();
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);

  React.useEffect(() => {
    if (document && isOpen) {
      setIsLoadingUrl(true);
      getDocumentDownloadUrl(document.file_path)
        .then(url => {
          setDocumentUrl(url);
        })
        .catch(error => {
          console.error('Error getting document URL:', error);
          toast({
            title: "Error",
            description: "Failed to load document for viewing.",
            variant: "destructive",
          });
        })
        .finally(() => {
          setIsLoadingUrl(false);
        });
    } else {
      setDocumentUrl(null);
    }
  }, [document, isOpen, toast]);

  const handleDownload = async () => {
    if (!document || !documentUrl) return;

    try {
      const link = window.document.createElement('a');
      link.href = documentUrl;
      link.download = document.file_name;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
    } catch (error) {
      toast({
        title: "Download failed",
        description: "An error occurred while downloading the file.",
        variant: "destructive",
      });
    }
  };

  const openInNewTab = () => {
    if (documentUrl) {
      window.open(documentUrl, '_blank');
    }
  };

  const isImageFile = (fileName: string) => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
    return imageExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
  };

  const isPdfFile = (fileName: string) => {
    return fileName.toLowerCase().endsWith('.pdf');
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!document) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-lg font-semibold truncate pr-4">
            {document.file_name}
          </DialogTitle>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={handleDownload} disabled={!documentUrl}>
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
            <Button variant="outline" size="sm" onClick={openInNewTab} disabled={!documentUrl}>
              <ExternalLink className="h-4 w-4 mr-1" />
              Open
            </Button>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          <div className="text-sm text-gray-500 mb-4">
            Size: {formatFileSize(document.file_size)} • 
            Uploaded: {new Date(document.created_at).toLocaleDateString()}
          </div>
          
          {isLoadingUrl ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-gray-500">Loading document...</p>
              </div>
            </div>
          ) : documentUrl ? (
            <div className="h-96 border rounded-lg overflow-hidden bg-gray-50">
              {isImageFile(document.file_name) ? (
                <img 
                  src={documentUrl} 
                  alt={document.file_name}
                  className="w-full h-full object-contain"
                />
              ) : isPdfFile(document.file_name) ? (
                <iframe
                  src={documentUrl}
                  className="w-full h-full border-0"
                  title={document.file_name}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="text-4xl mb-4">📄</div>
                    <p className="text-lg font-medium">{document.file_name}</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Preview not available for this file type.
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Use the download or open button to view the file.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="text-4xl mb-4">⚠️</div>
                <p className="text-lg font-medium">Unable to load document</p>
                <p className="text-sm text-gray-500 mt-2">
                  There was an error loading this document for preview.
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentViewer;

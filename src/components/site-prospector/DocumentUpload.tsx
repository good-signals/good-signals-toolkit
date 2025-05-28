import React, { useState, useCallback } from 'react';
import { Upload, File, Trash2, Download, Loader2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { AssessmentDocument, uploadAssessmentDocument, deleteAssessmentDocument, getDocumentDownloadUrl } from '@/services/documentService';
import DocumentViewer from './DocumentViewer';

interface DocumentUploadProps {
  assessmentId: string;
  documents: AssessmentDocument[];
  onDocumentsChange: () => void;
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({
  assessmentId,
  documents,
  onDocumentsChange,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [viewerDocument, setViewerDocument] = useState<AssessmentDocument | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    setIsUploading(true);
    try {
      const result = await uploadAssessmentDocument(assessmentId, file, user.id);
      
      if (result.success) {
        toast({
          title: "File uploaded successfully",
          description: `${file.name} has been attached to this assessment.`,
        });
        onDocumentsChange();
      } else {
        toast({
          title: "Upload failed",
          description: result.error || "Failed to upload file.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Upload error",
        description: "An unexpected error occurred during upload.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      // Reset the input
      event.target.value = '';
    }
  }, [assessmentId, user?.id, onDocumentsChange, toast]);

  const handleDelete = async (documentId: string, fileName: string) => {
    setDeletingIds(prev => new Set(prev).add(documentId));
    
    try {
      const success = await deleteAssessmentDocument(documentId);
      
      if (success) {
        toast({
          title: "File deleted",
          description: `${fileName} has been removed.`,
        });
        onDocumentsChange();
      } else {
        toast({
          title: "Delete failed",
          description: "Failed to delete the file.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Delete error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setDeletingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(documentId);
        return newSet;
      });
    }
  };

  const handleDownload = async (document: AssessmentDocument) => {
    try {
      const url = await getDocumentDownloadUrl(document.file_path);
      if (url) {
        const link = window.document.createElement('a');
        link.href = url;
        link.download = document.file_name;
        window.document.body.appendChild(link);
        link.click();
        window.document.body.removeChild(link);
      } else {
        toast({
          title: "Download failed",
          description: "Could not generate download link.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Download error",
        description: "An error occurred while downloading the file.",
        variant: "destructive",
      });
    }
  };

  const handleView = (document: AssessmentDocument) => {
    setViewerDocument(document);
    setIsViewerOpen(true);
  };

  const handleCloseViewer = () => {
    setIsViewerOpen(false);
    setViewerDocument(null);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <File className="h-5 w-5 mr-2" />
            Assessment Documents
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upload Section */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-600 mb-4">
              Attach documents like leases, marketing materials, photos, or other relevant files.
            </p>
            <div className="relative">
              <input
                type="file"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif,.webp"
              />
              <Button disabled={isUploading} variant="outline">
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Choose File
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Maximum file size: 50MB. Supported formats: PDF, DOC, XLS, TXT, JPG, PNG, GIF, WebP
            </p>
          </div>

          {/* Documents List */}
          {documents.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Attached Documents ({documents.length})</h4>
              {documents.map((document) => (
                <div
                  key={document.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
                >
                  <div className="flex items-center min-w-0 flex-1">
                    <File className="h-4 w-4 mr-2 text-gray-500 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate" title={document.file_name}>
                        {document.file_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(document.file_size)} • {new Date(document.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleView(document)}
                      title="View"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(document)}
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(document.id, document.file_name)}
                      disabled={deletingIds.has(document.id)}
                      title="Delete"
                    >
                      {deletingIds.has(document.id) ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <DocumentViewer
        document={viewerDocument}
        isOpen={isViewerOpen}
        onClose={handleCloseViewer}
      />
    </>
  );
};

export default DocumentUpload;

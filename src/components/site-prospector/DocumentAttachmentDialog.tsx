
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SiteAssessment } from '@/types/siteAssessmentTypes';
import { AssessmentDocument, getAssessmentDocuments } from '@/services/documentService';
import DocumentUpload from './DocumentUpload';

interface DocumentAttachmentDialogProps {
  assessment: SiteAssessment | null;
  isOpen: boolean;
  onClose: () => void;
}

const DocumentAttachmentDialog: React.FC<DocumentAttachmentDialogProps> = ({
  assessment,
  isOpen,
  onClose,
}) => {
  const [documents, setDocuments] = useState<AssessmentDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadDocuments = async () => {
    if (!assessment?.id) return;
    
    setIsLoading(true);
    try {
      const docs = await getAssessmentDocuments(assessment.id);
      setDocuments(docs);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && assessment?.id) {
      loadDocuments();
    }
  }, [isOpen, assessment?.id]);

  const handleDocumentsChange = () => {
    loadDocuments();
  };

  if (!assessment) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Documents for {assessment.assessment_name || 'Assessment'}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {assessment.address_line1}, {assessment.city}
          </p>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto">
          <DocumentUpload
            assessmentId={assessment.id}
            documents={documents}
            onDocumentsChange={handleDocumentsChange}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentAttachmentDialog;

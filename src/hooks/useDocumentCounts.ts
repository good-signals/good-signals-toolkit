
import { useState, useEffect } from 'react';
import { getAssessmentDocuments } from '@/services/documentService';

export const useDocumentCounts = (assessmentIds: string[]) => {
  const [documentCounts, setDocumentCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);

  const loadDocumentCounts = async () => {
    if (assessmentIds.length === 0) return;
    
    setIsLoading(true);
    try {
      const counts: Record<string, number> = {};
      
      // Load document counts for each assessment
      await Promise.all(
        assessmentIds.map(async (assessmentId) => {
          try {
            const documents = await getAssessmentDocuments(assessmentId);
            counts[assessmentId] = documents.length;
          } catch (error) {
            console.error(`Error loading documents for assessment ${assessmentId}:`, error);
            counts[assessmentId] = 0;
          }
        })
      );
      
      setDocumentCounts(counts);
    } catch (error) {
      console.error('Error loading document counts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocumentCounts();
  }, [assessmentIds.join(',')]);

  const refreshDocumentCount = async (assessmentId: string) => {
    try {
      const documents = await getAssessmentDocuments(assessmentId);
      setDocumentCounts(prev => ({
        ...prev,
        [assessmentId]: documents.length
      }));
    } catch (error) {
      console.error(`Error refreshing document count for assessment ${assessmentId}:`, error);
    }
  };

  return {
    documentCounts,
    isLoading,
    refreshDocumentCount,
    refreshAllCounts: loadDocumentCounts,
  };
};

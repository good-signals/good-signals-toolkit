
import { supabase } from '@/integrations/supabase/client';

export interface AssessmentDocument {
  id: string;
  assessment_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentUploadResult {
  success: boolean;
  document?: AssessmentDocument;
  error?: string;
}

export const uploadAssessmentDocument = async (
  assessmentId: string,
  file: File,
  userId: string
): Promise<DocumentUploadResult> => {
  try {
    // Create a unique file path
    const fileExtension = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`;
    const filePath = `${userId}/${assessmentId}/${fileName}`;

    // Upload file to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('assessment-documents')
      .upload(filePath, file);

    if (uploadError) {
      return { success: false, error: uploadError.message };
    }

    // Insert document record
    const { data: documentData, error: insertError } = await supabase
      .from('assessment_documents')
      .insert({
        assessment_id: assessmentId,
        file_name: file.name,
        file_path: uploadData.path,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: userId,
      })
      .select()
      .single();

    if (insertError) {
      // Clean up uploaded file if database insert fails
      await supabase.storage
        .from('assessment-documents')
        .remove([uploadData.path]);
      return { success: false, error: insertError.message };
    }

    return { success: true, document: documentData };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const getAssessmentDocuments = async (assessmentId: string): Promise<AssessmentDocument[]> => {
  const { data, error } = await supabase
    .from('assessment_documents')
    .select('*')
    .eq('assessment_id', assessmentId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching assessment documents:', error);
    return [];
  }

  return data || [];
};

export const deleteAssessmentDocument = async (documentId: string): Promise<boolean> => {
  try {
    // First get the document to know the file path
    const { data: document, error: fetchError } = await supabase
      .from('assessment_documents')
      .select('file_path')
      .eq('id', documentId)
      .single();

    if (fetchError || !document) {
      return false;
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('assessment-documents')
      .remove([document.file_path]);

    if (storageError) {
      console.error('Error deleting file from storage:', storageError);
      return false;
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('assessment_documents')
      .delete()
      .eq('id', documentId);

    return !deleteError;
  } catch (error) {
    console.error('Error deleting document:', error);
    return false;
  }
};

export const getDocumentDownloadUrl = async (filePath: string): Promise<string | null> => {
  const { data } = await supabase.storage
    .from('assessment-documents')
    .getPublicUrl(filePath);

  return data?.publicUrl || null;
};

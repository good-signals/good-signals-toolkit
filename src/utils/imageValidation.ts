
import { validateImageFile } from './fileValidation';

export interface ImageValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedFileName?: string;
}

export const validateAndSanitizeImage = (file: File): ImageValidationResult => {
  // Use existing file validation
  const basicValidation = validateImageFile(file);
  if (!basicValidation.isValid) {
    return basicValidation;
  }

  // Additional image-specific validations
  if (file.size === 0) {
    return {
      isValid: false,
      error: 'File appears to be empty or corrupted'
    };
  }

  // Sanitize filename for storage
  const timestamp = Date.now();
  const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const sanitizedFileName = `logo_${timestamp}.${fileExtension}`;

  return {
    isValid: true,
    sanitizedFileName
  };
};

export const createImagePreview = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        resolve(e.target.result as string);
      } else {
        reject(new Error('Failed to create image preview'));
      }
    };
    reader.onerror = () => reject(new Error('Error reading file'));
    reader.readAsDataURL(file);
  });
};

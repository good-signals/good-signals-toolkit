
// File upload security validation utilities
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/webp',
  'image/gif'
];

export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
}

export const validateFileType = (file: File, allowedTypes: string[]): FileValidationResult => {
  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: `File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`
    };
  }
  return { isValid: true };
};

export const validateFileSize = (file: File, maxSize: number): FileValidationResult => {
  if (file.size > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024));
    return {
      isValid: false,
      error: `File size ${Math.round(file.size / (1024 * 1024))}MB exceeds maximum allowed size of ${maxSizeMB}MB`
    };
  }
  return { isValid: true };
};

export const validateFileName = (fileName: string): FileValidationResult => {
  // Check for potentially dangerous file extensions
  const dangerousExtensions = ['.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar'];
  const lowercaseName = fileName.toLowerCase();
  
  for (const ext of dangerousExtensions) {
    if (lowercaseName.endsWith(ext)) {
      return {
        isValid: false,
        error: `File extension ${ext} is not allowed for security reasons`
      };
    }
  }
  
  // Check for path traversal attempts
  if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
    return {
      isValid: false,
      error: 'File name contains invalid characters'
    };
  }
  
  return { isValid: true };
};

export const validateImageFile = (file: File): FileValidationResult => {
  // Validate file type
  const typeValidation = validateFileType(file, ALLOWED_IMAGE_TYPES);
  if (!typeValidation.isValid) return typeValidation;
  
  // Validate file size
  const sizeValidation = validateFileSize(file, MAX_IMAGE_SIZE);
  if (!sizeValidation.isValid) return sizeValidation;
  
  // Validate file name
  const nameValidation = validateFileName(file.name);
  if (!nameValidation.isValid) return nameValidation;
  
  return { isValid: true };
};

export const validateDocumentFile = (file: File): FileValidationResult => {
  // Validate file type
  const typeValidation = validateFileType(file, ALLOWED_DOCUMENT_TYPES);
  if (!typeValidation.isValid) return typeValidation;
  
  // Validate file size
  const sizeValidation = validateFileSize(file, MAX_FILE_SIZE);
  if (!sizeValidation.isValid) return sizeValidation;
  
  // Validate file name
  const nameValidation = validateFileName(file.name);
  if (!nameValidation.isValid) return nameValidation;
  
  return { isValid: true };
};

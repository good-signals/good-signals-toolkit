
// Utility to validate and sanitize API keys
export const validateApiKey = (key: string | undefined): string | null => {
  if (!key || key.trim() === '') {
    return null;
  }
  
  // Remove any potential whitespace or invalid characters
  const sanitized = key.trim();
  
  // Basic validation for common API key formats
  if (sanitized.length < 10) {
    console.warn('API key appears to be too short');
    return null;
  }
  
  return sanitized;
};

// Check if an API key looks like a placeholder or development key
export const isValidProductionApiKey = (key: string): boolean => {
  const invalidPatterns = [
    /^test_/i,
    /^dev_/i,
    /^demo_/i,
    /^placeholder/i,
    /^your_key_here/i,
    /^abc123/i,
  ];
  
  return !invalidPatterns.some(pattern => pattern.test(key));
};

// Environment variable validation
export const getValidatedEnvVar = (name: string): string | null => {
  const value = import.meta.env[name];
  
  if (!value) {
    console.warn(`Environment variable ${name} is not set`);
    return null;
  }
  
  const validated = validateApiKey(value);
  if (!validated) {
    console.warn(`Environment variable ${name} is not valid`);
    return null;
  }
  
  if (!isValidProductionApiKey(validated)) {
    console.warn(`Environment variable ${name} appears to be a development/test key`);
  }
  
  return validated;
};

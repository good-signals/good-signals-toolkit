
// Input validation and sanitization utilities
export const sanitizeHtml = (input: string): string => {
  // Basic HTML sanitization - remove script tags and other dangerous elements
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
};

export const sanitizeMapEmbedCode = (input: string): string => {
  // Specialized sanitization for map embed codes that preserves trusted iframe content
  const trimmedInput = input.trim();
  
  // Remove dangerous scripts and event handlers
  let sanitized = trimmedInput
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
  
  // Check if this is an iframe from a trusted domain
  const iframeTrustedDomains = [
    'google.com',
    'maps.google.com',
    'www.google.com'
  ];
  
  // Extract src from iframe if present
  const srcMatch = sanitized.match(/src=['"](https?:\/\/[^'"]+)['"]/i);
  if (srcMatch) {
    const srcUrl = srcMatch[1];
    try {
      const url = new URL(srcUrl);
      const isTrusted = iframeTrustedDomains.some(domain => 
        url.hostname === domain || url.hostname.endsWith('.' + domain)
      );
      
      if (!isTrusted) {
        // Remove iframe if not from trusted domain
        sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
      }
    } catch (error) {
      // Invalid URL, remove iframe
      sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
    }
  }
  
  return sanitized;
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const sanitizeInput = (input: string): string => {
  // Remove potentially dangerous characters
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/['";]/g, '') // Remove quotes and semicolons
    .substring(0, 1000); // Limit length
};

export const validateUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
};

export const sanitizeNumericInput = (input: string | number): number | null => {
  const num = typeof input === 'string' ? parseFloat(input) : input;
  return isNaN(num) ? null : num;
};

export const validateMapEmbedCode = (embedCode: string): { isValid: boolean; error?: string } => {
  if (!embedCode.trim()) {
    return { isValid: false, error: "Embed code cannot be empty" };
  }
  
  // Check if it contains an iframe
  if (!/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/i.test(embedCode)) {
    return { isValid: false, error: "Embed code must contain an iframe element" };
  }
  
  // Check if it has a valid src attribute
  const srcMatch = embedCode.match(/src=['"](https?:\/\/[^'"]+)['"]/i);
  if (!srcMatch) {
    return { isValid: false, error: "Embed code must contain a valid src URL" };
  }
  
  try {
    const url = new URL(srcMatch[1]);
    const trustedDomains = ['google.com', 'maps.google.com', 'www.google.com'];
    const isTrusted = trustedDomains.some(domain => 
      url.hostname === domain || url.hostname.endsWith('.' + domain)
    );
    
    if (!isTrusted) {
      return { isValid: false, error: "Embed code must be from a trusted domain (Google Maps)" };
    }
  } catch (error) {
    return { isValid: false, error: "Embed code contains an invalid URL" };
  }
  
  return { isValid: true };
};

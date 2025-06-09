
export const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return localStorage.getItem(key);
      }
    } catch (error) {
      console.error(`Failed to get localStorage item "${key}":`, error);
    }
    return null;
  },

  setItem: (key: string, value: string): boolean => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(key, value);
        return true;
      }
    } catch (error) {
      console.error(`Failed to set localStorage item "${key}":`, error);
    }
    return false;
  },

  removeItem: (key: string): boolean => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(key);
        return true;
      }
    } catch (error) {
      console.error(`Failed to remove localStorage item "${key}":`, error);
    }
    return false;
  },

  safeParse: <T>(jsonString: string | null, fallback: T): T => {
    if (!jsonString) return fallback;
    
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('Failed to parse JSON:', error);
      return fallback;
    }
  },

  // Session storage methods
  sessionGetItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        return sessionStorage.getItem(key);
      }
    } catch (error) {
      console.error(`Failed to get sessionStorage item "${key}":`, error);
    }
    return null;
  },

  sessionSetItem: (key: string, value: string): boolean => {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.setItem(key, value);
        return true;
      }
    } catch (error) {
      console.error(`Failed to set sessionStorage item "${key}":`, error);
    }
    return false;
  },

  sessionRemoveItem: (key: string): boolean => {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.removeItem(key);
        return true;
      }
    } catch (error) {
      console.error(`Failed to remove sessionStorage item "${key}":`, error);
    }
    return false;
  },

  // Check if storage is available
  isStorageAvailable: (type: 'localStorage' | 'sessionStorage'): boolean => {
    try {
      if (typeof window === 'undefined') return false;
      const storage = window[type];
      const testKey = '__storage_test__';
      storage.setItem(testKey, 'test');
      storage.removeItem(testKey);
      return true;
    } catch (error) {
      return false;
    }
  }
};

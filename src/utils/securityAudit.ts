// Security audit and monitoring utilities
export interface SecurityEvent {
  type: 'auth_attempt' | 'data_access' | 'file_upload' | 'permission_denied';
  userId?: string;
  details: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high';
}

class SecurityAuditor {
  private events: SecurityEvent[] = [];
  private maxEvents = 1000;

  logEvent(event: Omit<SecurityEvent, 'timestamp'>): void {
    const fullEvent: SecurityEvent = {
      ...event,
      timestamp: new Date()
    };

    this.events.push(fullEvent);
    
    // Keep only the most recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Log high severity events to console
    if (event.severity === 'high') {
      console.warn('High severity security event:', fullEvent);
    }

    // In a production environment, you would send these to a monitoring service
    // this.sendToMonitoringService(fullEvent);
  }

  getRecentEvents(count: number = 10): SecurityEvent[] {
    return this.events.slice(-count);
  }

  getEventsByType(type: SecurityEvent['type']): SecurityEvent[] {
    return this.events.filter(event => event.type === type);
  }

  getHighSeverityEvents(): SecurityEvent[] {
    return this.events.filter(event => event.severity === 'high');
  }

  // private sendToMonitoringService(event: SecurityEvent): void {
  //   // Implementation would depend on your monitoring service
  //   // Examples: Sentry, LogRocket, DataDog, etc.
  // }
}

export const securityAuditor = new SecurityAuditor();

// Helper functions for common security events
export const logAuthAttempt = (success: boolean, email: string, userId?: string): void => {
  securityAuditor.logEvent({
    type: 'auth_attempt',
    userId,
    details: `Authentication ${success ? 'succeeded' : 'failed'} for ${email}`,
    severity: success ? 'low' : 'medium'
  });
};

export const logDataAccess = (userId: string, resource: string, action: string): void => {
  securityAuditor.logEvent({
    type: 'data_access',
    userId,
    details: `User accessed ${resource} with action: ${action}`,
    severity: 'low'
  });
};

export const logFileUpload = (userId: string, fileName: string, fileSize: number): void => {
  securityAuditor.logEvent({
    type: 'file_upload',
    userId,
    details: `File uploaded: ${fileName} (${fileSize} bytes)`,
    severity: 'low'
  });
};

export const logPermissionDenied = (userId: string, attemptedAction: string): void => {
  securityAuditor.logEvent({
    type: 'permission_denied',
    userId,
    details: `Permission denied for action: ${attemptedAction}`,
    severity: 'high'
  });
};

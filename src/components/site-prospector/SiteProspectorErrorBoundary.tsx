
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { safeStorage } from '@/utils/safeStorage';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  isFormError: boolean;
}

class SiteProspectorErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    isFormError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    const isFormError = error.message?.includes('watch') || 
                       error.message?.includes('useForm') || 
                       error.message?.includes('Cannot read properties of null');
    
    return { 
      hasError: true, 
      error,
      isFormError 
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('SiteProspectorErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
    
    // Auto-cleanup for form-related errors
    if (this.state.isFormError) {
      this.handleClearStorage();
    }
  }

  private handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined,
      isFormError: false 
    });
    
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private handleClearStorage = () => {
    try {
      // Clear Site Prospector specific storage using safe storage utility
      const keys = [
        'siteProspector_currentStep', 
        'siteProspector_activeAssessmentId', 
        'siteProspector_selectedMetricSetId',
        'siteProspector_sessionVersion'
      ];
      keys.forEach(key => safeStorage.sessionRemoveItem(key));
      
      // Also clear any form data storage
      if (safeStorage.isStorageAvailable('sessionStorage')) {
        const allKeys = Object.keys(sessionStorage).filter(key => 
          key.startsWith('siteProspector_') || 
          key.startsWith('inputMetricValues_')
        );
        allKeys.forEach(key => safeStorage.sessionRemoveItem(key));
      }
      
      console.log('Cleared Site Prospector storage after error');
    } catch (error) {
      console.error('Failed to clear storage:', error);
    }
  };

  private handleReloadPage = () => {
    this.handleClearStorage();
    window.location.reload();
  };

  private handleGoHome = () => {
    this.handleClearStorage();
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                {this.state.isFormError ? 'Form Error Detected' : 'Something went wrong'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {this.state.isFormError ? (
                <div className="space-y-2">
                  <p className="text-muted-foreground">
                    A form initialization error occurred. This usually happens when there's corrupted session data.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    The system has automatically cleared the problematic data. Please try again.
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground">
                  The Site Prospector encountered an unexpected error and couldn't load properly.
                </p>
              )}
              
              {this.state.error && !this.state.isFormError && (
                <div className="bg-muted p-3 rounded-md">
                  <p className="font-mono text-sm text-destructive">
                    {this.state.error.message}
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={this.handleReset} variant="outline">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
                
                {this.state.isFormError ? (
                  <Button onClick={this.handleReloadPage} variant="default">
                    Refresh Page
                  </Button>
                ) : (
                  <Button onClick={this.handleClearStorage} variant="destructive">
                    Clear Data & Reset
                  </Button>
                )}
                
                <Button onClick={this.handleGoHome} variant="secondary">
                  <Home className="mr-2 h-4 w-4" />
                  Go Home
                </Button>
              </div>

              <div className="text-xs text-muted-foreground mt-4">
                <p>
                  {this.state.isFormError 
                    ? 'If this form error persists after refreshing, please contact support.'
                    : 'If this problem persists, try clearing your browser cache or contact support.'
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default SiteProspectorErrorBoundary;

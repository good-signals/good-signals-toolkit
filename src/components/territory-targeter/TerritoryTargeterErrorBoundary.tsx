
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
  isStateError: boolean;
}

class TerritoryTargeterErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    isStateError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    const isStateError = error.message?.includes('localStorage') || 
                        error.message?.includes('JSON') || 
                        error.message?.includes('Cannot read properties of null') ||
                        error.message?.includes('criteriaColumns');
    
    return { 
      hasError: true, 
      error,
      isStateError 
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('TerritoryTargeterErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
    
    // Auto-cleanup for state-related errors
    if (this.state.isStateError) {
      this.handleClearStorage();
    }
  }

  private handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined,
      isStateError: false 
    });
    
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private handleClearStorage = () => {
    try {
      // Clear Territory Targeter specific storage
      const keys = [
        'territoryTargeter_currentAnalysis',
        'territoryTargeter_cbsaData',
        'territoryTargeter_analysisState'
      ];
      keys.forEach(key => safeStorage.removeItem(key));
      
      console.log('Cleared Territory Targeter storage after error');
      
      // Show user-friendly message
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Failed to clear storage:', error);
    }
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
                {this.state.isStateError ? 'Data Recovery Error' : 'Something went wrong'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {this.state.isStateError ? (
                <div className="space-y-2">
                  <p className="text-muted-foreground">
                    There was an issue with your saved analysis data. This usually happens when browser data becomes corrupted.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    The system will clear the problematic data and refresh automatically.
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground">
                  The Territory Targeter encountered an unexpected error and couldn't load properly.
                </p>
              )}
              
              {this.state.error && !this.state.isStateError && (
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
                
                <Button onClick={this.handleClearStorage} variant="default">
                  Clear Data & Refresh
                </Button>
                
                <Button onClick={this.handleGoHome} variant="secondary">
                  <Home className="mr-2 h-4 w-4" />
                  Go Home
                </Button>
              </div>

              <div className="text-xs text-muted-foreground mt-4">
                <p>
                  If this problem persists, try clearing your browser cache or contact support.
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

export default TerritoryTargeterErrorBoundary;

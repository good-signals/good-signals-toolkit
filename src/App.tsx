
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { SuperAdminProvider } from '@/contexts/SuperAdminContext';
import ErrorBoundary from '@/components/common/ErrorBoundary';

// Pages
import LandingPage from '@/pages/LandingPage';
import AuthPage from '@/pages/AuthPage';
import ToolkitHub from '@/pages/ToolkitHub';
import AccountSelectionPage from '@/pages/AccountSelectionPage';
import TargetSelectionPage from '@/pages/TargetSelectionPage';
import TargetMetricsBuilderPage from '@/pages/TargetMetricsBuilderPage';
import TargetMetricSetsListPage from '@/pages/TargetMetricSetsListPage';
import StandardMetricsManagement from '@/pages/StandardMetricsManagement';
import TerritoryTargeterPage from '@/pages/TerritoryTargeterPage';
import SiteProspectorPage from '@/pages/SiteProspectorPage';
import SiteTreasureMapPage from '@/pages/SiteTreasureMapPage';
import TreasureMapSettingsPage from '@/pages/TreasureMapSettingsPage';
import TreasureMapUploadPage from '@/pages/TreasureMapUploadPage';
import AccountManagementPage from '@/pages/AccountManagementPage';
import ProfileSettingsPage from '@/pages/ProfileSettingsPage';
import SignalSettingsPage from '@/pages/SignalSettingsPage';
import SuperAdminDashboard from '@/pages/SuperAdminDashboard';
import SuperAdminUsersPage from '@/pages/SuperAdminUsersPage';
import SuperAdminAccountsPage from '@/pages/SuperAdminAccountsPage';
import NotFound from '@/pages/NotFound';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SuperAdminProvider>
            <Router>
              <div className="min-h-screen bg-background">
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/auth" element={<AuthPage />} />
                  <Route path="/toolkit-hub" element={<ToolkitHub />} />
                  <Route path="/account-selection" element={<AccountSelectionPage />} />
                  <Route path="/target-selection" element={<TargetSelectionPage />} />
                  <Route path="/target-metrics-builder" element={<TargetMetricsBuilderPage />} />
                  <Route path="/target-metric-sets" element={<TargetMetricSetsListPage />} />
                  <Route path="/standard-metrics" element={<StandardMetricsManagement />} />
                  <Route path="/territory-targeter" element={<TerritoryTargeterPage />} />
                  <Route path="/site-prospector" element={<SiteProspectorPage />} />
                  <Route path="/site-treasure-map" element={<SiteTreasureMapPage />} />
                  <Route path="/treasure-map-settings" element={<TreasureMapSettingsPage />} />
                  <Route path="/treasure-map-upload" element={<TreasureMapUploadPage />} />
                  <Route path="/account-management" element={<AccountManagementPage />} />
                  <Route path="/profile-settings" element={<ProfileSettingsPage />} />
                  <Route path="/signal-settings" element={<SignalSettingsPage />} />
                  <Route path="/super-admin" element={<SuperAdminDashboard />} />
                  <Route path="/super-admin/users" element={<SuperAdminUsersPage />} />
                  <Route path="/super-admin/accounts" element={<SuperAdminAccountsPage />} />
                  <Route path="/404" element={<NotFound />} />
                  <Route path="*" element={<Navigate to="/404" replace />} />
                </Routes>
              </div>
              <Toaster />
            </Router>
          </SuperAdminProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;

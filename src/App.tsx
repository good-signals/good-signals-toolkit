
import { AuthProvider } from "@/contexts/AuthContext"; 
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet, Navigate } from "react-router-dom"; 
import React from "react";

import MainLayout from "./components/layout/MainLayout";
import LandingPage from "./pages/LandingPage";
import ToolkitHub from "./pages/ToolkitHub";
import SiteProspectorPage from "./pages/SiteProspectorPage";
import TerritoryTargeterPage from "./pages/TerritoryTargeterPage";
import SiteTreasureMapPage from "./pages/SiteTreasureMapPage";
import TreasureMapSettingsPage from "./pages/TreasureMapSettingsPage";
import TreasureMapUploadPage from "./pages/TreasureMapUploadPage";
import AuthPage from "./pages/AuthPage"; 
import ProfileSettingsPage from "./pages/ProfileSettingsPage";
import AccountManagementPage from "./pages/AccountManagementPage";
import NotFound from "./pages/NotFound";
import TargetSelectionPage from "./pages/TargetSelectionPage";
import TargetMetricsBuilderPage from "./pages/TargetMetricsBuilderPage";
import TargetMetricSetsListPage from "./pages/TargetMetricSetsListPage";
import SignalSettingsPage from "./pages/SignalSettingsPage";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import StandardMetricsManagement from "./pages/StandardMetricsManagement";
import { useAuth } from "./contexts/AuthContext";

const queryClient = new QueryClient();

// ProtectedRoute component
const ProtectedRoute: React.FC<{ children: JSX.Element }> = ({ children }) => {
  const { user, authLoading } = useAuth();

  if (authLoading) {
    return <div className="flex justify-center items-center h-screen"><p>Loading authentication state...</p></div>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return children;
};

// Super Admin Protected Route
const SuperAdminRoute: React.FC<{ children: JSX.Element }> = ({ children }) => {
  const { user, isSuperAdmin, authLoading } = useAuth();

  if (authLoading) {
    return <div className="flex justify-center items-center h-screen"><p>Loading authentication state...</p></div>;
  }

  if (!user || !isSuperAdmin) {
    return <Navigate to="/toolkit-hub" replace />;
  }

  return children;
};

const AppRoutes = () => (
  <MainLayout>
    <Outlet />
  </MainLayout>
);

const AppContent = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/" element={<AppRoutes />}>
          <Route index element={<LandingPage />} />
          <Route 
            path="toolkit-hub" 
            element={<ProtectedRoute><ToolkitHub /></ProtectedRoute>} 
          />
          <Route 
            path="toolkit/site-prospector" 
            element={<ProtectedRoute><SiteProspectorPage /></ProtectedRoute>} 
          />
          <Route 
            path="toolkit/territory-targeter" 
            element={<ProtectedRoute><TerritoryTargeterPage /></ProtectedRoute>} 
          />
          <Route 
            path="toolkit/site-treasure-map" 
            element={<ProtectedRoute><SiteTreasureMapPage /></ProtectedRoute>} 
          />
          <Route 
            path="treasure-map-settings" 
            element={<ProtectedRoute><TreasureMapSettingsPage /></ProtectedRoute>} 
          />
          <Route 
            path="treasure-map-upload" 
            element={<ProtectedRoute><TreasureMapUploadPage /></ProtectedRoute>} 
          />
          <Route 
            path="profile-settings" 
            element={<ProtectedRoute><ProfileSettingsPage /></ProtectedRoute>} 
          />
          <Route 
            path="account-management"
            element={<ProtectedRoute><AccountManagementPage /></ProtectedRoute>} 
          />
          <Route 
            path="target-selection" 
            element={<ProtectedRoute><TargetSelectionPage /></ProtectedRoute>} 
          />
          <Route 
            path="target-metrics-builder" 
            element={<ProtectedRoute><TargetMetricsBuilderPage /></ProtectedRoute>} 
          />
          <Route 
            path="target-metrics-builder/:metricSetId" 
            element={<ProtectedRoute><TargetMetricsBuilderPage /></ProtectedRoute>} 
          />
          <Route 
            path="target-metric-sets" 
            element={<ProtectedRoute><TargetMetricSetsListPage /></ProtectedRoute>} 
          />
          <Route 
            path="signal-settings"
            element={<ProtectedRoute><SignalSettingsPage /></ProtectedRoute>}
          />
          {/* Super Admin Routes */}
          <Route 
            path="super-admin" 
            element={<SuperAdminRoute><SuperAdminDashboard /></SuperAdminRoute>} 
          />
          <Route 
            path="super-admin/standard-metrics" 
            element={<SuperAdminRoute><StandardMetricsManagement /></SuperAdminRoute>} 
          />
          <Route 
            path="super-admin/standard-metrics/builder" 
            element={<SuperAdminRoute><TargetMetricsBuilderPage /></SuperAdminRoute>} 
          />
          <Route 
            path="super-admin/standard-metrics/builder/:metricSetId" 
            element={<SuperAdminRoute><TargetMetricsBuilderPage /></SuperAdminRoute>} 
          />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AppContent />
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

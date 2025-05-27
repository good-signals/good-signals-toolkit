import { AuthProvider } from "@/contexts/AuthContext"; 
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet, Navigate } from "react-router-dom"; 

import MainLayout from "./components/layout/MainLayout";
import LandingPage from "./pages/LandingPage";
import ToolkitHub from "./pages/ToolkitHub";
import SiteProspectorPage from "./pages/SiteProspectorPage";
import TerritoryTargeterPage from "./pages/TerritoryTargeterPage";
import SiteTreasureMapPage from "./pages/SiteTreasureMapPage";
import AuthPage from "./pages/AuthPage"; 
import ProfileSettingsPage from "./pages/ProfileSettingsPage";
import AccountManagementPage from "./pages/AccountManagementPage"; // Import the new page
import NotFound from "./pages/NotFound";
import TargetSelectionPage from "./pages/TargetSelectionPage"; // Added
import TargetMetricsBuilderPage from "./pages/TargetMetricsBuilderPage"; // Added
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
            element={
              <ProtectedRoute>
                <ToolkitHub />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="toolkit/site-prospector" 
            element={
              <ProtectedRoute>
                <SiteProspectorPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="toolkit/territory-targeter" 
            element={
              <ProtectedRoute>
                <TerritoryTargeterPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="toolkit/site-treasure-map" 
            element={
              <ProtectedRoute>
                <SiteTreasureMapPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="profile-settings" 
            element={
              <ProtectedRoute>
                <ProfileSettingsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="account-management" // Add this new route
            element={
              <ProtectedRoute>
                <AccountManagementPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="target-selection" // Added route
            element={
              <ProtectedRoute>
                <TargetSelectionPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="target-metrics-builder" // Added route
            element={
              <ProtectedRoute>
                <TargetMetricsBuilderPage />
              </ProtectedRoute>
            } 
          />
          {/* ADD ALL CUSTOM ROUTES INSIDE THIS AppRoutes Route for MainLayout */}
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider> {/* AuthProvider now wraps AppContent */}
        <Toaster />
        <Sonner />
        <AppContent /> {/* AppContent contains BrowserRouter and Routes */}
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

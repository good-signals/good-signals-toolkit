
import { AuthProvider } from "@/contexts/AuthContext"; 
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet, Navigate } from "react-router-dom"; // Added Navigate

import MainLayout from "./components/layout/MainLayout";
import LandingPage from "./pages/LandingPage";
import ToolkitHub from "./pages/ToolkitHub";
import SiteProspectorPage from "./pages/SiteProspectorPage";
import TerritoryTargeterPage from "./pages/TerritoryTargeterPage";
import SiteTreasureMapPage from "./pages/SiteTreasureMapPage";
import AuthPage from "./pages/AuthPage"; 
import ProfileSettingsPage from "./pages/ProfileSettingsPage"; // Import the new page
import NotFound from "./pages/NotFound";
import { useAuth } from "./contexts/AuthContext"; // For ProtectedRoute

const queryClient = new QueryClient();

// ProtectedRoute component
const ProtectedRoute: React.FC<{ children: JSX.Element }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    // You can return a loading spinner here
    return <div>Loading authentication state...</div>;
  }

  if (!user) {
    // User not authenticated, redirect to auth page
    return <Navigate to="/auth" replace />;
  }

  return children; // User authenticated, render the requested component
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

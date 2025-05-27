
import { AuthProvider } from "@/contexts/AuthContext"; // Import AuthProvider
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";

import MainLayout from "./components/layout/MainLayout";
import LandingPage from "./pages/LandingPage";
import ToolkitHub from "./pages/ToolkitHub";
import SiteProspectorPage from "./pages/SiteProspectorPage";
import TerritoryTargeterPage from "./pages/TerritoryTargeterPage";
import SiteTreasureMapPage from "./pages/SiteTreasureMapPage";
import AuthPage from "./pages/AuthPage"; // Import AuthPage
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppRoutes = () => (
  <MainLayout>
    <Outlet />
  </MainLayout>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider> {/* Wrap with AuthProvider */}
        <Toaster />
        <Sonner /> {/* Ensure Sonner is within AuthProvider if toasts need auth context, though unlikely */}
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<AuthPage />} /> {/* Add AuthPage route */}
            <Route path="/" element={<AppRoutes />}>
              <Route index element={<LandingPage />} />
              <Route path="toolkit-hub" element={<ToolkitHub />} />
              <Route path="toolkit/site-prospector" element={<SiteProspectorPage />} />
              <Route path="toolkit/territory-targeter" element={<TerritoryTargeterPage />} />
              <Route path="toolkit/site-treasure-map" element={<SiteTreasureMapPage />} />
              {/* ADD ALL CUSTOM ROUTES INSIDE THIS AppRoutes Route for MainLayout */}
            </Route>
            {/* Fallback for routes not matching MainLayout structure or for standalone pages */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;


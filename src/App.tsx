import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import CyberBackground from "@/components/CyberBackground";
import LandingPage from "./pages/LandingPage.tsx";
import Login from "./pages/Login.tsx";
import Signup from "./pages/Signup.tsx";
import VerifyEmail from "./pages/VerifyEmail.tsx";
import Home from "./pages/Home.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import LiveMonitoring from "./pages/LiveMonitoring.tsx";
import AnalyzeLogs from "./pages/AnalyzeLogs.tsx";
import HistoryPage from "./pages/HistoryPage.tsx";
import AskAi from "./pages/AskAi.tsx";
import ToolsPage from "./pages/ToolsPage.tsx";
import UpcomingFeaturesPage from "./pages/UpcomingFeaturesPage.tsx";
import SettingsPage from "./pages/SettingsPage.tsx";
import ProfilePage from "./pages/ProfilePage.tsx";
import ReportPage from "./pages/ReportPage.tsx";
import PricingPage from "./pages/PricingPage.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/" element={isAuthenticated ? <Home /> : <LandingPage />} />
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/security" element={<LandingPage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/signup" element={isAuthenticated ? <Navigate to="/" replace /> : <Signup />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/monitoring" element={<PrivateRoute><LiveMonitoring /></PrivateRoute>} />
      <Route path="/analyze" element={<PrivateRoute><AnalyzeLogs /></PrivateRoute>} />
      <Route path="/report" element={<PrivateRoute><ReportPage /></PrivateRoute>} />
      <Route path="/tools" element={<PrivateRoute><ToolsPage /></PrivateRoute>} />
      <Route path="/upcoming" element={<PrivateRoute><UpcomingFeaturesPage /></PrivateRoute>} />
      <Route path="/history" element={<PrivateRoute><HistoryPage /></PrivateRoute>} />
      <Route path="/ask-ai" element={<PrivateRoute><AskAi /></PrivateRoute>} />
      <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <div className="dark" style={{ minHeight: "100vh", background: "#080a14", position: "relative" }}>
            <CyberBackground />
            <AppRoutes />
          </div>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

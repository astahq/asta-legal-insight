import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProfileProvider } from "@/contexts/ProfileContext";
import { BillingProvider } from "@/contexts/BillingContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import UploadLegalPack from "./pages/UploadLegalPack";
import Reports from "./pages/Reports";
import ReportDetail from "./pages/ReportDetail";
import Watchlist from "./pages/Watchlist";
import Settings from "./pages/Settings";
import Support from "./pages/Support";
import Pricing from "./pages/Pricing";
import Billing from "./pages/Billing";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ProfileProvider>
            <BillingProvider>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                <Route path="/upload" element={<ProtectedRoute><UploadLegalPack /></ProtectedRoute>} />
                <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
                <Route path="/reports/:id" element={<ProtectedRoute><ReportDetail /></ProtectedRoute>} />
                <Route path="/watchlist" element={<ProtectedRoute><Watchlist /></ProtectedRoute>} />
                <Route path="/pricing" element={<ProtectedRoute><Pricing /></ProtectedRoute>} />
                <Route path="/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="/compare" element={<NotFound />} />
                <Route path="/support" element={<ProtectedRoute><Support /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BillingProvider>
          </ProfileProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

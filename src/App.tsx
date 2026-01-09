import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LocaleProvider } from "@/i18n";
import { AuthProvider } from "@/contexts/AuthContext";
import { EntitlementsProvider } from "@/contexts/EntitlementsContext";
import { lazy, Suspense } from "react";
import Index from "./pages/Index";
import BePrepared from "./pages/BePrepared";
import Products from "./pages/Products";
import Pricing from "./pages/Pricing";
import Library from "./pages/Library";
import Tips from "./pages/Tips";
import RiskCalculator from "./pages/RiskCalculator";
import SuppliesPlanner from "./pages/SuppliesPlanner";
import WeeklyBriefing from "./pages/WeeklyBriefing";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import Dashboard from "./pages/Dashboard";
import Vault from "./pages/premium/Vault";
import Plans from "./pages/premium/Plans";
import RedFolder from "./pages/premium/RedFolder";
import Backup from "./pages/premium/Backup";
import Onboarding from "./pages/premium/Onboarding";
import Toolkit from "./pages/Toolkit";
import Panic from "./pages/Panic";
import PanicSetup from "./pages/panic/Setup";
import PanicTest from "./pages/panic/Test";
import PanicHistory from "./pages/panic/History";
import NotFound from "./pages/NotFound";
import RiskFunnel from "./pages/RiskFunnel";
import PurchaseSuccess from "./pages/PurchaseSuccess";

// DEV-only: Lazy load AuthDebugPanel
const AuthDebugPanel = import.meta.env.DEV 
  ? lazy(() => import("./components/AuthDebugPanel"))
  : null;

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LocaleProvider>
      <AuthProvider>
        <EntitlementsProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/be-prepared" element={<BePrepared />} />
                <Route path="/products" element={<Products />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/library" element={<Library />} />
                <Route path="/tips" element={<Tips />} />
                <Route path="/tools/risk" element={<RiskCalculator />} />
                <Route path="/tools/supplies" element={<SuppliesPlanner />} />
                <Route path="/news/weekly" element={<WeeklyBriefing />} />
                <Route path="/login" element={<Auth />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/premium/vault" element={<Vault />} />
                <Route path="/premium/plans" element={<Plans />} />
                <Route path="/premium/red-folder" element={<RedFolder />} />
                <Route path="/premium/backup" element={<Backup />} />
                <Route path="/premium/onboarding" element={<Onboarding />} />
                {/* New product pillars */}
                <Route path="/toolkit" element={<Toolkit />} />
                <Route path="/panic" element={<Panic />} />
                <Route path="/panic/setup" element={<PanicSetup />} />
                <Route path="/panic/test" element={<PanicTest />} />
                <Route path="/panic/history" element={<PanicHistory />} />
                {/* Standalone funnel (no navbar/footer) */}
                <Route path="/riskfunnel" element={<RiskFunnel />} />
                <Route path="/purchase-success" element={<PurchaseSuccess />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              {/* DEV-only: Auth debug panel */}
              {import.meta.env.DEV && AuthDebugPanel && (
                <Suspense fallback={null}>
                  <AuthDebugPanel />
                </Suspense>
              )}
            </BrowserRouter>
          </TooltipProvider>
        </EntitlementsProvider>
      </AuthProvider>
    </LocaleProvider>
  </QueryClientProvider>
);

export default App;
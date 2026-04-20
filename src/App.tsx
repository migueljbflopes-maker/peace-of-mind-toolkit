import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LocaleProvider } from "@/i18n";
import { AuthProvider } from "@/contexts/AuthContext";
import { EntitlementsProvider } from "@/contexts/EntitlementsContext";
import { VaultKeyProvider } from "@/contexts/VaultKeyContext";
import { MasterKeyGate } from "@/components/security/MasterKeyGate";
import { lazy, Suspense } from "react";
import { usePageTracking } from "@/hooks/usePageTracking";
import ScrollToTop from "./components/ScrollToTop";

// Eagerly loaded: high-traffic pages
import Index from "./pages/Index";
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

import NotFound from "./pages/NotFound";

// Lazy loaded: less-visited routes
const Vault = lazy(() => import("./pages/premium/Vault"));
const Plans = lazy(() => import("./pages/premium/Plans"));
const PlansWizard = lazy(() => import("./pages/premium/PlansWizard"));
const RedFolder = lazy(() => import("./pages/premium/RedFolder"));
const Backup = lazy(() => import("./pages/premium/Backup"));
const Onboarding = lazy(() => import("./pages/premium/Onboarding"));
const RiskAssessment = lazy(() => import("./pages/premium/RiskAssessment"));
const Expert = lazy(() => import("./pages/premium/Expert"));
const Panic = lazy(() => import("./pages/Panic"));
const PanicSetup = lazy(() => import("./pages/panic/Setup"));
const PanicTest = lazy(() => import("./pages/panic/Test"));
const PanicHistory = lazy(() => import("./pages/panic/History"));
const RiskFunnel = lazy(() => import("./pages/riskFunnel/RiskFunnel"));
const RiskFunnel1 = lazy(() => import("./pages/riskFunnel/RiskFunnel1"));
const PurchaseSuccess = lazy(() => import("./pages/PurchaseSuccess"));
const Claim = lazy(() => import("./pages/Claim"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const AdminIndex = lazy(() => import("./pages/admin/Index"));
const AdminUsers = lazy(() => import("./pages/admin/Users"));
const AdminAnalytics = lazy(() => import("./pages/admin/Analytics"));
const AdminFeatures = lazy(() => import("./pages/admin/Features"));
const AdminAffiliates = lazy(() => import("./pages/admin/Affiliates"));
const AdminEmails = lazy(() => import("./pages/admin/Emails"));
const AdminPrompts = lazy(() => import("./pages/admin/Prompts"));

// DEV-only: Lazy load AuthDebugPanel
const AuthDebugPanel = import.meta.env.DEV 
  ? lazy(() => import("./components/AuthDebugPanel"))
  : null;

// Page tracking wrapper
function PageTracker({ children }: { children: React.ReactNode }) {
  usePageTracking();
  return <>{children}</>;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Suspense fallback for lazy routes
function LazyFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LocaleProvider>
      <AuthProvider>
        <EntitlementsProvider>
          <VaultKeyProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <PageTracker>
                <ScrollToTop />
                <Suspense fallback={<LazyFallback />}>
              <Routes>
                <Route path="/" element={<Index />} />
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
                <Route path="/premium/vault" element={<MasterKeyGate><Vault /></MasterKeyGate>} />
                <Route path="/premium/plans" element={<MasterKeyGate><Plans /></MasterKeyGate>} />
                <Route path="/premium/plans/wizard" element={<MasterKeyGate><PlansWizard /></MasterKeyGate>} />
                <Route path="/premium/red-folder" element={<MasterKeyGate><RedFolder /></MasterKeyGate>} />
                <Route path="/premium/backup" element={<MasterKeyGate><Backup /></MasterKeyGate>} />
                <Route path="/premium/onboarding" element={<Onboarding />} />
                <Route path="/premium/risk" element={<RiskAssessment />} />
                <Route path="/premium/expert" element={<Expert />} />
                <Route path="/toolkit" element={<Navigate to="/pricing" replace />} />
                <Route path="/panic" element={<Panic />} />
                <Route path="/panic/setup" element={<PanicSetup />} />
                <Route path="/panic/test" element={<PanicTest />} />
                <Route path="/panic/history" element={<PanicHistory />} />
                <Route path="/riskfunnel" element={<RiskFunnel />} />
                <Route path="/riskfunnel1" element={<RiskFunnel1 />} />
                <Route path="/purchase-success" element={<PurchaseSuccess />} />
                <Route path="/claim" element={<Claim />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/admin" element={<AdminIndex />} />
                <Route path="/admin/users" element={<AdminUsers />} />
                <Route path="/admin/analytics" element={<AdminAnalytics />} />
                <Route path="/admin/features" element={<AdminFeatures />} />
                <Route path="/admin/affiliates" element={<AdminAffiliates />} />
                <Route path="/admin/emails" element={<AdminEmails />} />
                <Route path="/admin/prompts" element={<AdminPrompts />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              </Suspense>
              {/* DEV-only: Auth debug panel */}
              {import.meta.env.DEV && AuthDebugPanel && (
                <Suspense fallback={null}>
                  <AuthDebugPanel />
                </Suspense>
              )}
                </PageTracker>
              </BrowserRouter>
            </TooltipProvider>
          </VaultKeyProvider>
        </EntitlementsProvider>
      </AuthProvider>
    </LocaleProvider>
  </QueryClientProvider>
);

export default App;

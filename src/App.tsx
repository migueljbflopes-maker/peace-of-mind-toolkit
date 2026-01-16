import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LocaleProvider } from "@/i18n";
import { AuthProvider } from "@/contexts/AuthContext";
import { EntitlementsProvider } from "@/contexts/EntitlementsContext";
import { lazy, Suspense } from "react";
import { usePageTracking } from "@/hooks/usePageTracking";
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
import Vault from "./pages/premium/Vault";
import Plans from "./pages/premium/Plans";
import PlansWizard from "./pages/premium/PlansWizard";
import RedFolder from "./pages/premium/RedFolder";
import Backup from "./pages/premium/Backup";
import Onboarding from "./pages/premium/Onboarding";
import RiskAssessment from "./pages/premium/RiskAssessment";
import Expert from "./pages/premium/Expert";
import Toolkit from "./pages/Toolkit";
import Panic from "./pages/Panic";
import PanicSetup from "./pages/panic/Setup";
import PanicTest from "./pages/panic/Test";
import PanicHistory from "./pages/panic/History";
import NotFound from "./pages/NotFound";
import RiskFunnel from "./pages/RiskFunnel";
import RiskFunnel1 from "./pages/RiskFunnel1";
import PurchaseSuccess from "./pages/PurchaseSuccess";
import Claim from "./pages/Claim";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import ScrollToTop from "./components/ScrollToTop";
// Admin pages
import AdminIndex from "./pages/admin/Index";
import AdminUsers from "./pages/admin/Users";
import AdminAnalytics from "./pages/admin/Analytics";
import AdminFeatures from "./pages/admin/Features";
import AdminAffiliates from "./pages/admin/Affiliates";
import AdminEmails from "./pages/admin/Emails";
import AdminPrompts from "./pages/admin/Prompts";

// DEV-only: Lazy load AuthDebugPanel
const AuthDebugPanel = import.meta.env.DEV 
  ? lazy(() => import("./components/AuthDebugPanel"))
  : null;

// Page tracking wrapper
function PageTracker({ children }: { children: React.ReactNode }) {
  usePageTracking();
  return <>{children}</>;
}

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
              <PageTracker>
              <ScrollToTop />
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
                <Route path="/premium/vault" element={<Vault />} />
                <Route path="/premium/plans" element={<Plans />} />
                <Route path="/premium/plans/wizard" element={<PlansWizard />} />
                <Route path="/premium/red-folder" element={<RedFolder />} />
                <Route path="/premium/backup" element={<Backup />} />
                <Route path="/premium/onboarding" element={<Onboarding />} />
                <Route path="/premium/risk" element={<RiskAssessment />} />
                <Route path="/premium/expert" element={<Expert />} />
                {/* New product pillars */}
                <Route path="/toolkit" element={<Toolkit />} />
                <Route path="/panic" element={<Panic />} />
                <Route path="/panic/setup" element={<PanicSetup />} />
                <Route path="/panic/test" element={<PanicTest />} />
                <Route path="/panic/history" element={<PanicHistory />} />
                {/* Standalone funnel (no navbar/footer) */}
                <Route path="/riskfunnel" element={<RiskFunnel />} />
                <Route path="/riskfunnel1" element={<RiskFunnel1 />} />
                <Route path="/purchase-success" element={<PurchaseSuccess />} />
                <Route path="/claim" element={<Claim />} />
                {/* Legal pages */}
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
                {/* Admin pages */}
                <Route path="/admin" element={<AdminIndex />} />
                <Route path="/admin/users" element={<AdminUsers />} />
                <Route path="/admin/analytics" element={<AdminAnalytics />} />
                <Route path="/admin/features" element={<AdminFeatures />} />
                <Route path="/admin/affiliates" element={<AdminAffiliates />} />
                <Route path="/admin/emails" element={<AdminEmails />} />
                <Route path="/admin/prompts" element={<AdminPrompts />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              {/* DEV-only: Auth debug panel */}
              {import.meta.env.DEV && AuthDebugPanel && (
                <Suspense fallback={null}>
                  <AuthDebugPanel />
                </Suspense>
              )}
              </PageTracker>
            </BrowserRouter>
          </TooltipProvider>
        </EntitlementsProvider>
      </AuthProvider>
    </LocaleProvider>
  </QueryClientProvider>
);

export default App;
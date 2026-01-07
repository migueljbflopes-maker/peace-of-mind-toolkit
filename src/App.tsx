import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LocaleProvider } from "@/i18n";
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
import Dashboard from "./pages/Dashboard";
import Vault from "./pages/premium/Vault";
import Plans from "./pages/premium/Plans";
import RedFolder from "./pages/premium/RedFolder";
import Backup from "./pages/premium/Backup";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LocaleProvider>
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
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/premium/vault" element={<Vault />} />
            <Route path="/premium/plans" element={<Plans />} />
            <Route path="/premium/red-folder" element={<RedFolder />} />
            <Route path="/premium/backup" element={<Backup />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </LocaleProvider>
  </QueryClientProvider>
);

export default App;
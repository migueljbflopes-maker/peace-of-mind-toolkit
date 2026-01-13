import { Link } from "react-router-dom";
import { ArrowRight, AlertTriangle } from "lucide-react";
import Navbar from "@/components/Navbar";
import NewHero from "@/components/NewHero";
import ProductPillars from "@/components/ProductPillars";
import NewHowItWorks from "@/components/NewHowItWorks";
import OfflineReassurance from "@/components/OfflineReassurance";
import FAQ from "@/components/FAQ";
import FinalCTA from "@/components/FinalCTA";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <NewHero />
        <ProductPillars />
        <NewHowItWorks />
        
        {/* Free Risk Check CTA */}
        <section className="py-12 bg-section">
          <div className="container mx-auto px-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              Not sure where to start?
            </h2>
            <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
              Take our free 3-minute risk check to understand your current preparedness level.
            </p>
            <Link to="/tools/risk">
              <Button variant="outline" className="gap-2">
                Take Free Risk Check
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
        
        <OfflineReassurance />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
};

export default Index;

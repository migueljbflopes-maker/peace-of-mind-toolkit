import { Link } from "react-router-dom";
import { ArrowRight, ShoppingBag } from "lucide-react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import QuickEntryStrip from "@/components/QuickEntryStrip";
import ValueSection from "@/components/ValueSection";
import HowItWorks from "@/components/HowItWorks";
import FeaturesSection from "@/components/FeaturesSection";
import TipsPreview from "@/components/TipsPreview";
import PricingTeaser from "@/components/PricingTeaser";
import FAQ from "@/components/FAQ";
import FinalCTA from "@/components/FinalCTA";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Hero />
        <QuickEntryStrip />
        <ValueSection />
        <HowItWorks />
        <FeaturesSection />
        <TipsPreview />
        
        {/* Products Teaser */}
        <section id="products" className="bg-section-light py-12">
          <div className="container mx-auto px-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <ShoppingBag className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold text-foreground">
                Recommended products
              </h2>
            </div>
            <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
              Practical, no-hype items that support your preparedness plan.
            </p>
            <Link to="/products">
              <Button variant="outline" className="gap-2">
                Browse products
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
        
        <PricingTeaser />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
};

export default Index;

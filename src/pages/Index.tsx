import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import QuickEntryStrip from "@/components/QuickEntryStrip";
import ValueSection from "@/components/ValueSection";
import HowItWorks from "@/components/HowItWorks";
import FeaturesSection from "@/components/FeaturesSection";
import TipsPreview from "@/components/TipsPreview";
import ProductsSection from "@/components/ProductsSection";
import PricingTeaser from "@/components/PricingTeaser";
import FAQ from "@/components/FAQ";
import FinalCTA from "@/components/FinalCTA";
import Footer from "@/components/Footer";

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
        <ProductsSection />
        <PricingTeaser />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
};

export default Index;

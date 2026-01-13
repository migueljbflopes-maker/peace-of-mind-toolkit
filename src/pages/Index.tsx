import Navbar from "@/components/Navbar";
import SplitHero from "@/components/home/SplitHero";
import BugInOutStrip from "@/components/home/BugInOutStrip";
import HowItWorksNew from "@/components/home/HowItWorksNew";
import WhatYouGet from "@/components/home/WhatYouGet";
import CalculatorsHook from "@/components/home/CalculatorsHook";
import PremiumTeaser from "@/components/home/PremiumTeaser";
import ResourcesSection from "@/components/home/ResourcesSection";
import SocialProof from "@/components/home/SocialProof";
import FAQ from "@/components/FAQ";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <SplitHero />
        <BugInOutStrip />
        <HowItWorksNew />
        <WhatYouGet />
        <CalculatorsHook />
        <PremiumTeaser />
        <ResourcesSection />
        <SocialProof />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
};

export default Index;

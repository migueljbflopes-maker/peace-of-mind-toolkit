import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, AlertCircle, CheckCircle } from "lucide-react";
import heroSplitBg from "@/assets/hero-split-bg.png";
const NewHero = () => {
  return <section className="relative min-h-[85vh] md:min-h-[80vh] flex items-center justify-center bg-cover bg-center" style={{
    backgroundImage: `url(${heroSplitBg})`
  }}>
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />
      
      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto py-8">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-sm font-medium mb-6">
          <Shield className="h-4 w-4" />
          Preparedness made simple
        </div>

        {/* Headline */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 drop-shadow-lg tracking-tight leading-tight">Am I Ready? 
Find Out Before It’s Too Late<br className="hidden sm:block" />
          <span className="text-primary-foreground/90"> Find Out Before It’s Too Late</span>
        </h1>
        
        <p className="text-lg sm:text-xl md:text-2xl text-white/85 mb-8 drop-shadow-md max-w-2xl mx-auto">Life can change in an instant. We help you plan, protect, and act — so you can face uncertainty with confidence.</p>
        
        {/* Two Primary CTAs */}
        <div className="flex flex-col sm:flex-row justify-center gap-4 mb-8">
          <Link to="/toolkit">
            <Button variant="cta" size="lg" className="w-full sm:w-auto text-base md:text-lg px-8 py-6 shadow-xl hover:shadow-2xl transition-all gap-2">
              <Shield className="h-5 w-5" />
              Create my Safe Toolkit
            </Button>
          </Link>
          <Link to="/panic/setup">
            <Button variant="hero-outline" size="lg" className="w-full sm:w-auto text-base md:text-lg px-8 py-6 shadow-xl hover:shadow-2xl transition-all bg-white/10 backdrop-blur-sm border-white text-white hover:bg-white hover:text-foreground gap-2">
              <AlertCircle className="h-5 w-5" />
              Set up Panic Button
            </Button>
          </Link>
        </div>
        
        {/* Trust bullets */}
        <div className="flex flex-wrap justify-center gap-4 md:gap-6">
          <span className="text-white/90 text-xs md:text-sm font-medium flex items-center gap-1.5">
            <CheckCircle className="h-4 w-4 text-primary" />
            Works offline
          </span>
          <span className="text-white/90 text-xs md:text-sm font-medium flex items-center gap-1.5">
            <CheckCircle className="h-4 w-4 text-primary" />
            End-to-end encrypted
          </span>
          <span className="text-white/90 text-xs md:text-sm font-medium flex items-center gap-1.5">
            <CheckCircle className="h-4 w-4 text-primary" />
            No subscription
          </span>
        </div>
      </div>
    </section>;
};
export default NewHero;
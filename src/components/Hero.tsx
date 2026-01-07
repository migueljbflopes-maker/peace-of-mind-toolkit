import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import heroSplitBg from "@/assets/hero-split-bg.png";

const Hero = () => {
  return (
    <section 
      className="relative min-h-[60vh] md:min-h-[75vh] flex items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: `url(${heroSplitBg})` }}
    >
      {/* Dark overlay for text readability */}
      <div className="absolute inset-0 bg-black/30" />
      
      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-3xl mx-auto">
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 drop-shadow-lg tracking-tight">
          Are you Ready?
        </h1>
        <p className="text-xl sm:text-2xl md:text-3xl text-white/90 mb-8 drop-shadow-md font-medium">
          Which Plan should you follow?
        </p>
        
        {/* CTAs */}
        <div className="flex flex-wrap justify-center gap-4">
          <Link to="/tools/risk">
            <Button variant="cta" size="lg" className="text-base md:text-lg px-8 py-6 shadow-xl hover:shadow-2xl transition-shadow">
              Free Risk Analysis
            </Button>
          </Link>
          <Link to="/tools/supplies">
            <Button variant="hero-outline" size="lg" className="text-base md:text-lg px-8 py-6 shadow-xl hover:shadow-2xl transition-shadow bg-white/10 backdrop-blur-sm border-white text-white hover:bg-white hover:text-navy">
              Create Plan Now
            </Button>
          </Link>
        </div>
        
        {/* Trust bullets */}
        <div className="flex flex-wrap justify-center gap-4 md:gap-6 mt-8">
          <span className="text-white/90 text-xs md:text-sm font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-white/80 rounded-full" />
            Works offline
          </span>
          <span className="text-white/90 text-xs md:text-sm font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-white/80 rounded-full" />
            No login needed
          </span>
          <span className="text-white/90 text-xs md:text-sm font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-white/80 rounded-full" />
            Printable plans
          </span>
        </div>
      </div>
    </section>
  );
};

export default Hero;

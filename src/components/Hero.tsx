import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import iconBugIn from "@/assets/icon-bug-in.jpg";
import iconBugOut from "@/assets/icon-bug-out.jpg";

const Hero = () => {
  return (
    <section className="relative min-h-[60vh] md:min-h-[70vh] flex flex-col md:flex-row">
      {/* Left: Bug In - Blue overlay */}
      <div 
        className="relative flex-1 bg-cover bg-center min-h-[30vh] md:min-h-0"
        style={{ backgroundImage: `url(${iconBugIn})` }}
      >
        <div className="absolute inset-0 bg-blue-700/65" />
        <div className="relative z-10 h-full flex items-end justify-start p-6 md:p-10">
          <div className="text-white">
            <p className="text-xs md:text-sm font-bold uppercase tracking-widest opacity-90">Bug In:</p>
            <h2 className="text-2xl md:text-4xl font-bold tracking-tight">HOME READY.</h2>
          </div>
        </div>
      </div>
      
      {/* Right: Bug Out - Orange overlay */}
      <div 
        className="relative flex-1 bg-cover bg-center min-h-[30vh] md:min-h-0"
        style={{ backgroundImage: `url(${iconBugOut})` }}
      >
        <div className="absolute inset-0 bg-amber-600/70" />
        <div className="relative z-10 h-full flex items-end justify-end p-6 md:p-10 text-right">
          <div className="text-white">
            <p className="text-xs md:text-sm font-bold uppercase tracking-widest opacity-90">Bug Out:</p>
            <h2 className="text-2xl md:text-4xl font-bold tracking-tight">GO BAG READY.</h2>
          </div>
        </div>
      </div>
      
      {/* Center CTA overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none px-4">
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white text-center mb-6 drop-shadow-lg tracking-tight">
          DO YOU HAVE BOTH PLANS?
        </h1>
        <Link to="/tools/risk" className="pointer-events-auto">
          <Button variant="cta" size="lg" className="text-base md:text-lg px-8 py-6 shadow-xl hover:shadow-2xl transition-shadow">
            FREE RISK ANALYSIS
          </Button>
        </Link>
        
        {/* Trust bullets */}
        <div className="flex flex-wrap justify-center gap-4 md:gap-6 mt-6 pointer-events-auto">
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

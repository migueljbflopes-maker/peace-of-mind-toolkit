import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Wifi, BookOpen, UserX, ArrowRight, ClipboardList } from "lucide-react";
import heroGobag from "@/assets/hero-gobag.jpg";

const SplitHero = () => {
  return (
    <section className="min-h-[85vh] bg-background">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center min-h-[85vh] py-12">
          {/* Text Content */}
          <div className="order-2 lg:order-1 max-w-xl">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight tracking-tight">
              Be ready.{" "}
              <span className="text-teal">Stay calm.</span>
            </h1>
            
            <p className="text-lg sm:text-xl text-muted-foreground mb-8 leading-relaxed">
              A practical preparedness toolkit that works offline — assess your risk, 
              build your supplies, and generate a printable plan.
            </p>
            
            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Link to="/tools/risk">
                <Button 
                  variant="cta" 
                  size="lg" 
                  className="w-full sm:w-auto text-base px-8 py-6 shadow-lg hover:shadow-xl transition-all gap-2"
                >
                  Start Free Assessment
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link to="/tools/supplies">
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="w-full sm:w-auto text-base px-8 py-6 border-teal text-teal hover:bg-teal hover:text-white transition-all gap-2"
                >
                  <ClipboardList className="h-5 w-5" />
                  Build My Supplies List
                </Button>
              </Link>
            </div>
            
            {/* Microtrust Row */}
            <div className="flex flex-wrap gap-4 mb-4">
              <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <Wifi className="h-4 w-4 text-teal" />
                Works offline
              </span>
              <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <BookOpen className="h-4 w-4 text-teal" />
                Official guidance
              </span>
              <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <UserX className="h-4 w-4 text-teal" />
                No login required to start
              </span>
            </div>
            
            {/* Conversion note */}
            <p className="text-xs text-muted-foreground/70">
              Save/export requires login.
            </p>
          </div>
          
          {/* Image */}
          <div className="order-1 lg:order-2">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl">
              <img 
                src={heroGobag} 
                alt="Emergency go-bag ready by the door" 
                className="w-full h-auto object-cover aspect-[4/3]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SplitHero;

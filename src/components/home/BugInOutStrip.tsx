import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, Backpack, ArrowRight } from "lucide-react";
import iconBugIn from "@/assets/icon-bug-in.jpg";
import iconBugOut from "@/assets/icon-bug-out.jpg";

const BugInOutStrip = () => {
  return (
    <section className="py-12 bg-teal-muted/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            Do you have both plans?
          </h2>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-8">
          {/* Bug In Card */}
          <div className="bg-card rounded-2xl overflow-hidden shadow-soft border border-border/50 card-hover">
            <div className="aspect-[16/9] overflow-hidden">
              <img 
                src={iconBugIn} 
                alt="Home preparedness" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-lg bg-teal-muted">
                  <Home className="h-5 w-5 text-teal" />
                </div>
                <span className="text-xs font-medium text-teal uppercase tracking-wide">Bug In</span>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">Home Ready</h3>
              <p className="text-sm text-muted-foreground">
                Shelter in place with supplies, power, and water for 14+ days.
              </p>
            </div>
          </div>
          
          {/* Bug Out Card */}
          <div className="bg-card rounded-2xl overflow-hidden shadow-soft border border-border/50 card-hover">
            <div className="aspect-[16/9] overflow-hidden">
              <img 
                src={iconBugOut} 
                alt="Go-bag preparedness" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-lg bg-amber-100">
                  <Backpack className="h-5 w-5 text-amber-600" />
                </div>
                <span className="text-xs font-medium text-amber-600 uppercase tracking-wide">Bug Out</span>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">Go Bag Ready</h3>
              <p className="text-sm text-muted-foreground">
                Grab-and-go kit with essentials for 72 hours away from home.
              </p>
            </div>
          </div>
        </div>
        
        <div className="text-center">
          <Link to="/tools/risk">
            <Button variant="outline" className="gap-2">
              Free risk analysis
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default BugInOutStrip;

import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Target, ClipboardList, ArrowRight, Lock } from "lucide-react";

const CalculatorsHook = () => {
  return (
    <section className="py-16 md:py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <span className="inline-block text-sm font-medium text-teal mb-2">Be Prepared</span>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            Start with a calculator
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Free tools to understand your readiness level.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Risk Calculator */}
          <div className="bg-card rounded-2xl p-6 shadow-soft border border-border/50 card-hover">
            <div className="flex items-start justify-between mb-4">
              <div className="w-14 h-14 rounded-xl bg-teal-muted flex items-center justify-center">
                <Target className="h-7 w-7 text-teal" />
              </div>
            </div>
            
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Risk Calculator
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Get your readiness score and personalized next steps in 3 minutes.
            </p>
            
            {/* Progress placeholder */}
            <div className="mb-4 p-3 rounded-lg bg-section border border-border/50">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Preparedness</span>
                <span className="font-medium text-foreground">Not assessed</span>
              </div>
            </div>
            
            <Link to="/tools/risk">
              <Button className="w-full gap-2 bg-teal hover:bg-teal-light">
                Take the assessment
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          
          {/* Supplies Planner */}
          <div className="bg-card rounded-2xl p-6 shadow-soft border border-border/50 card-hover">
            <div className="flex items-start justify-between mb-4">
              <div className="w-14 h-14 rounded-xl bg-emerald-light/20 flex items-center justify-center">
                <ClipboardList className="h-7 w-7 text-emerald" />
              </div>
            </div>
            
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Supplies Planner
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Generate a printable checklist customized for your household.
            </p>
            
            {/* Progress placeholder */}
            <div className="mb-4 p-3 rounded-lg bg-section border border-border/50">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Preparedness</span>
                <span className="font-medium text-foreground">Not planned</span>
              </div>
            </div>
            
            <Link to="/tools/supplies">
              <Button className="w-full gap-2 bg-emerald hover:bg-emerald-light">
                Plan my supplies
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
        
        {/* Premium teaser */}
        <div className="mt-6 max-w-4xl mx-auto">
          <Link to="/pricing">
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 flex items-center justify-between hover:bg-amber-100 transition-colors">
              <div className="flex items-center gap-3">
                <Lock className="h-5 w-5 text-amber-600" />
                <span className="text-sm text-amber-800">
                  <strong>Red Folder PDF export</strong> — save your plans as a printable document
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-amber-600" />
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default CalculatorsHook;

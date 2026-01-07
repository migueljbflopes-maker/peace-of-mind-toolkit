import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield } from "lucide-react";

const FinalCTA = () => {
  return (
    <section className="container-wide section-padding py-16 sm:py-20">
      <div className="relative rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-10 sm:p-14 text-center overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10">
          <div className="inline-flex p-3 rounded-2xl bg-white/10 mb-6">
            <Shield className="h-8 w-8 text-primary-foreground" />
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold text-primary-foreground mb-4">
            Start free. Upgrade when you're ready.
          </h2>
          <p className="text-lg text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            Join thousands of households who have taken the first step toward peace of mind.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/start">
              <Button
                size="xl"
                className="bg-white text-primary hover:bg-white/90 font-semibold shadow-lg"
              >
                Start Free
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/pricing">
              <Button
                variant="outline"
                size="xl"
                className="border-2 border-white/30 text-primary-foreground hover:bg-white/10 font-semibold"
              >
                View Pricing
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FinalCTA;

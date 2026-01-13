import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Target, ClipboardList, Shield, ArrowRight } from "lucide-react";

const HowItWorksNew = () => {
  const steps = [
    {
      icon: Target,
      number: "1",
      title: "Assess",
      description: "Get a readiness score + risk map for your city.",
      cta: "Take the assessment",
      href: "/tools/risk",
      color: "teal",
    },
    {
      icon: ClipboardList,
      number: "2",
      title: "Prepare",
      description: "Generate a supplies list that matches your household.",
      cta: "Plan supplies",
      href: "/tools/supplies",
      color: "emerald",
    },
    {
      icon: Shield,
      number: "3",
      title: "Secure",
      description: "Save everything offline and export your Red Folder PDF.",
      cta: "See Premium",
      href: "/pricing",
      color: "amber",
      isPremium: true,
    },
  ];

  return (
    <section className="py-16 md:py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            How it works
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Three simple steps to complete peace of mind.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {steps.map((step) => (
            <div 
              key={step.number} 
              className="relative bg-card rounded-2xl p-6 shadow-soft border border-border/50 card-hover"
            >
              {/* Number badge */}
              <div className={`absolute -top-3 -left-3 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step.color === 'teal' ? 'bg-teal text-white' :
                step.color === 'emerald' ? 'bg-emerald text-white' :
                'bg-amber-500 text-white'
              }`}>
                {step.number}
              </div>
              
              {/* Icon */}
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                step.color === 'teal' ? 'bg-teal-muted text-teal' :
                step.color === 'emerald' ? 'bg-emerald-light/20 text-emerald' :
                'bg-amber-100 text-amber-600'
              }`}>
                <step.icon className="h-6 w-6" />
              </div>
              
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {step.description}
              </p>
              
              <Link to={step.href}>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={`gap-1.5 p-0 h-auto hover:bg-transparent ${
                    step.color === 'teal' ? 'text-teal hover:text-teal-light' :
                    step.color === 'emerald' ? 'text-emerald hover:text-emerald-light' :
                    'text-amber-600 hover:text-amber-500'
                  }`}
                >
                  {step.cta}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              
              {step.isPremium && (
                <span className="absolute top-4 right-4 badge-premium">
                  Premium
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksNew;

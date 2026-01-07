import { ClipboardCheck, Package, Lock, ArrowRight } from "lucide-react";
const HowItWorks = () => {
  const steps = [{
    number: "01",
    icon: ClipboardCheck,
    title: "Assess",
    description: "Know your risks in 2 minutes",
    color: "bg-amber-100 text-amber-600"
  }, {
    number: "02",
    icon: Package,
    title: "Prepare",
    description: "Build your 14-day supplies plan",
    color: "bg-emerald-100 text-emerald-600"
  }, {
    number: "03",
    icon: Lock,
    title: "Secure",
    description: "Store critical info, access offline",
    color: "bg-primary/10 text-primary",
    isPremium: true
  }];
  return <section className="container-wide section-padding py-12 sm:py-16">
      <div className="text-center mb-10">
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
          How it works
        </h2>
        <p className="text-muted-foreground">
          Three simple steps to complete preparedness.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {steps.map((step, index) => <div key={index} className="relative">
            {/* Connector line - desktop only */}
            {index < steps.length - 1 && <div className="hidden md:flex absolute top-14 left-full w-full items-center justify-center -translate-x-1/2 z-0">
                <ArrowRight className="h-5 w-5 text-border" />
              </div>}

            <div className="relative z-10 text-center p-6 rounded-2xl bg-card border border-border/50 shadow-soft transition-all duration-300 hover:shadow-soft-lg">
              {/* Step number */}
              

              {/* Icon */}
              <div className={`inline-flex p-4 rounded-2xl ${step.color} mb-4`}>
                <step.icon className="h-7 w-7" />
              </div>

              {/* Content */}
              <h3 className="text-lg font-bold text-foreground mb-2 flex items-center justify-center gap-2">
                {step.title}
                {step.isPremium && <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                    Premium
                  </span>}
              </h3>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </div>
          </div>)}
      </div>
    </section>;
};
export default HowItWorks;
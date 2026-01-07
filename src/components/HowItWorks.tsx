import { ClipboardCheck, Package, Lock, ArrowRight } from "lucide-react";

const HowItWorks = () => {
  const steps = [
    {
      number: "01",
      icon: ClipboardCheck,
      title: "Assess",
      description: "Complete a quick risk assessment to understand your household's specific needs and vulnerabilities.",
      color: "bg-amber-50 text-amber-600",
    },
    {
      number: "02",
      icon: Package,
      title: "Prepare",
      description: "Get a personalized 14-day supplies plan based on your family size, location, and dietary needs.",
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      number: "03",
      icon: Lock,
      title: "Secure",
      description: "Premium: Store critical documents in your encrypted Vault, generate your Red Folder PDF, and create backup plans.",
      color: "bg-primary/10 text-primary",
      isPremium: true,
    },
  ];

  return (
    <section className="container-wide section-padding py-16 sm:py-20">
      <div className="text-center mb-12">
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
          How it works
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Three simple steps to complete preparedness.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {steps.map((step, index) => (
          <div key={index} className="relative">
            {/* Connector line */}
            {index < steps.length - 1 && (
              <div className="hidden md:block absolute top-16 left-full w-full">
                <ArrowRight className="h-6 w-6 text-border -translate-x-1/2" />
              </div>
            )}

            <div className="group text-center p-6">
              {/* Step number */}
              <span className="inline-block text-sm font-medium text-muted-foreground mb-4">
                {step.number}
              </span>

              {/* Icon */}
              <div className={`inline-flex p-4 rounded-2xl ${step.color} mb-5 transition-transform group-hover:scale-110`}>
                <step.icon className="h-8 w-8" />
              </div>

              {/* Content */}
              <h3 className="text-xl font-semibold text-foreground mb-3 flex items-center justify-center gap-2">
                {step.title}
                {step.isPremium && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
                    Premium
                  </span>
                )}
              </h3>
              <p className="text-muted-foreground leading-relaxed">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default HowItWorks;

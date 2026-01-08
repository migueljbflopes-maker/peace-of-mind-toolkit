import { Shield, Settings, Download } from "lucide-react";

const NewHowItWorks = () => {
  const steps = [
    {
      icon: Shield,
      number: "1",
      title: "Assess your readiness",
      description: "Take our free 3-minute risk check to understand your current preparedness level.",
    },
    {
      icon: Settings,
      number: "2",
      title: "Set up your tools",
      description: "Configure your Safe Toolkit and Panic Button with your personal information.",
    },
    {
      icon: Download,
      number: "3",
      title: "Be ready anywhere",
      description: "Access everything offline. Print your Red Folder. Stay calm in any situation.",
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

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {steps.map((step) => (
            <div key={step.number} className="relative text-center">
              {/* Connector line (hidden on mobile, last item) */}
              <div className="hidden md:block absolute top-8 left-1/2 w-full h-0.5 bg-gradient-to-r from-primary/20 to-primary/5 -z-10 last:hidden" />
              
              {/* Icon with number */}
              <div className="relative inline-flex mb-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <step.icon className="h-7 w-7 text-primary" />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                  {step.number}
                </div>
              </div>

              <h3 className="text-lg font-semibold text-foreground mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default NewHowItWorks;

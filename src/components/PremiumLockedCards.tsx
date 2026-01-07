import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Lock, FileText, Shield, Map, Cloud, ArrowRight } from "lucide-react";

const PremiumLockedCards = () => {
  const premiumFeatures = [
    {
      icon: FileText,
      title: "Red Folder",
      description: "Printable emergency PDF",
    },
    {
      icon: Shield,
      title: "Vault",
      description: "Encrypted document storage",
    },
    {
      icon: Map,
      title: "Plans A & B",
      description: "Exit routes & protocols",
    },
    {
      icon: Cloud,
      title: "Backup",
      description: "Encrypted cloud backup",
    },
  ];

  return (
    <section className="container-wide section-padding py-12 sm:py-16">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-sm font-medium mb-4">
            <Lock className="h-3.5 w-3.5" />
            Premium Features
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            Complete protection with Premium
          </h2>
          <p className="text-muted-foreground">
            Unlock printable offline documentation for peace of mind.
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {premiumFeatures.map((feature, index) => (
            <div
              key={index}
              className="relative p-5 rounded-xl bg-card border border-border/50 text-center"
            >
              {/* Lock overlay */}
              <div className="absolute top-3 right-3">
                <Lock className="h-3.5 w-3.5 text-muted-foreground/50" />
              </div>

              <div className="inline-flex p-3 rounded-xl bg-muted/50 text-muted-foreground mb-3">
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">{feature.title}</h3>
              <p className="text-xs text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center bg-section rounded-2xl p-6 border border-border/50">
          <p className="text-lg font-semibold text-foreground mb-1">
            €49 one-time purchase
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            No subscription. Lifetime access.
          </p>
          <Link to="/pricing">
            <Button variant="cta" size="lg" className="gap-2">
              Unlock Premium
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default PremiumLockedCards;
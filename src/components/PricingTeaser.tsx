import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, FileText, Lock, Map, Shield, ArrowRight } from "lucide-react";
import { useEntitlements } from "@/hooks/useEntitlements";

const PricingTeaser = () => {
  const { isPremium } = useEntitlements();

  // Don't show purchase prompts to premium users
  if (isPremium) {
    return null;
  }

  const features = [
    { icon: FileText, label: "Red Folder PDF — your emergency document bundle" },
    { icon: Lock, label: "Encrypted Vault for sensitive documents" },
    { icon: Map, label: "Plans A & B with evacuation routes" },
    { icon: Shield, label: "Encrypted backup & restore" },
  ];

  return (
    <section id="pricing" className="container-wide section-padding py-12 sm:py-16">
      <div className="max-w-2xl mx-auto">
        <div className="relative rounded-2xl bg-section border border-border/50 p-8 sm:p-10 text-center">
          {/* Badge */}
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-sm font-medium mb-5">
            <Check className="h-3.5 w-3.5" />
            No subscription
          </span>

          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
            Premium — €49
          </h2>
          <p className="text-muted-foreground mb-8">
            One-time purchase. Lifetime access. No recurring fees.
          </p>

          <ul className="space-y-3 text-left max-w-sm mx-auto mb-8">
            {features.map((feature, index) => (
              <li key={index} className="flex items-start gap-3">
                <div className="p-1 rounded-md bg-amber-100 text-amber-600 mt-0.5">
                  <feature.icon className="h-4 w-4" />
                </div>
                <span className="text-foreground">{feature.label}</span>
              </li>
            ))}
          </ul>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/pricing">
              <Button variant="cta" size="lg" className="gap-2">
                Unlock Premium (€49)
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/start">
              <Button variant="hero-outline" size="lg">
                Start Free First
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingTeaser;
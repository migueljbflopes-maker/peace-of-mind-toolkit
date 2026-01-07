import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, FileText, Lock, Map, Shield } from "lucide-react";

const PricingTeaser = () => {
  const features = [
    { icon: FileText, label: "Red Folder PDF — your emergency document bundle" },
    { icon: Lock, label: "Encrypted Vault for sensitive documents" },
    { icon: Map, label: "Plans A & B with evacuation routes" },
    { icon: Shield, label: "Encrypted backup & restore" },
  ];

  return (
    <section id="pricing" className="container-wide section-padding py-16 sm:py-20">
      <div className="max-w-2xl mx-auto">
        <div className="relative rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 p-8 sm:p-10 text-center">
          {/* Badge */}
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Check className="h-3.5 w-3.5" />
            No subscription
          </span>

          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
            Premium — €49
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            One-time purchase. Lifetime access. No recurring fees.
          </p>

          <ul className="space-y-3 text-left max-w-sm mx-auto mb-8">
            {features.map((feature, index) => (
              <li key={index} className="flex items-start gap-3">
                <div className="p-1 rounded-md bg-primary/10 text-primary mt-0.5">
                  <feature.icon className="h-4 w-4" />
                </div>
                <span className="text-foreground">{feature.label}</span>
              </li>
            ))}
          </ul>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/pricing">
              <Button variant="hero" size="lg">
                Unlock Premium (€49)
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

import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Check,
  AlertTriangle,
  Package,
  Library,
  Lightbulb,
  Newspaper,
  FileText,
  Lock,
  Map,
  Cloud,
} from "lucide-react";
import { useEntitlements } from "@/hooks/useEntitlements";

const FeaturesSection = () => {
  const { isPremium } = useEntitlements();

  const tiers = [
    {
      name: "Free",
      subtitle: "No login required",
      price: "€0",
      priceNote: "forever",
      features: [
        { icon: AlertTriangle, label: "Risk score & radar assessment" },
        { icon: Package, label: "Supplies list view" },
        { icon: Library, label: "Full library access" },
        { icon: Lightbulb, label: "Tips & peace of mind articles" },
        { icon: Newspaper, label: "Weekly briefing" },
      ],
      footnote: "Create a free account to save & sync progress.",
      cta: { label: "Start Free", href: "/start", variant: "outline" as const },
    },
    {
      name: "Premium",
      subtitle: "One-time purchase",
      price: "€49",
      priceNote: "no subscription",
      highlight: true,
      features: [
        { icon: Check, label: "Everything in Free" },
        { icon: FileText, label: "Red Folder PDF generator" },
        { icon: Lock, label: "Encrypted Vault storage" },
        { icon: Map, label: "Plans A & B with maps" },
        { icon: Cloud, label: "Encrypted backup/restore" },
      ],
      cta: isPremium 
        ? { label: "Access Your Features", href: "/dashboard", variant: "cta" as const }
        : { label: "Unlock Premium (€49)", href: "/pricing", variant: "cta" as const },
    },
  ];

  return (
    <section id="features" className="bg-section py-12 sm:py-16">
      <div className="container-wide section-padding">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            Choose your level
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Start free, upgrade when you're ready for complete protection.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {tiers.map((tier, index) => (
            <div
              key={index}
              className={`relative rounded-2xl p-6 transition-all ${
                tier.highlight
                  ? "bg-card border-2 border-cta shadow-soft-xl"
                  : "bg-card border border-border/50 shadow-soft"
              }`}
            >
              {tier.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-xs font-semibold bg-cta text-cta-foreground rounded-full">
                  Recommended
                </span>
              )}

              <div className="mb-5">
                <h3 className="text-xl font-bold text-foreground">{tier.name}</h3>
                <p className="text-sm text-muted-foreground">{tier.subtitle}</p>
              </div>

              <div className="mb-5">
                <span className="text-4xl font-bold text-foreground">{tier.price}</span>
                <span className="text-sm text-muted-foreground ml-2">{tier.priceNote}</span>
              </div>

              <ul className="space-y-3 mb-5">
                {tier.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start gap-3 text-sm">
                    <feature.icon className="h-4 w-4 text-cta mt-0.5 shrink-0" />
                    <span className="text-foreground">{feature.label}</span>
                  </li>
                ))}
              </ul>

              {tier.footnote && (
                <p className="text-xs text-muted-foreground mb-5 italic">
                  {tier.footnote}
                </p>
              )}

              <Link to={tier.cta.href}>
                <Button variant={tier.cta.variant} className="w-full">
                  {tier.cta.label}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
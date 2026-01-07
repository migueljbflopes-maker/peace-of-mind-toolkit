import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Check,
  AlertTriangle,
  Package,
  Library,
  Lightbulb,
  Newspaper,
  Bookmark,
  Cloud,
  FileText,
  Lock,
  Map,
  Activity,
  Users,
} from "lucide-react";

const FeaturesSection = () => {
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
      cta: { label: "Start Free", href: "/start", variant: "secondary" as const },
    },
    {
      name: "Login",
      subtitle: "Still free",
      price: "€0",
      priceNote: "with account",
      features: [
        { icon: Check, label: "Everything in Free" },
        { icon: Bookmark, label: "Save results & progress" },
        { icon: Bookmark, label: "Bookmarks & drafts" },
        { icon: Cloud, label: "Sync across devices" },
      ],
      cta: { label: "Create Account", href: "/start", variant: "secondary" as const },
    },
    {
      name: "Premium",
      subtitle: "One-time purchase",
      price: "€49",
      priceNote: "no subscription",
      highlight: true,
      features: [
        { icon: Check, label: "Everything in Login" },
        { icon: FileText, label: "Red Folder PDF generator" },
        { icon: Lock, label: "Encrypted Vault storage" },
        { icon: Map, label: "Plans A & B with maps" },
        { icon: Cloud, label: "Encrypted backup/restore" },
        { icon: Activity, label: "Real-time risk insights layer" },
        { icon: Users, label: "Legacy Locker (Coming soon)" },
      ],
      cta: { label: "Unlock Premium (€49)", href: "/pricing", variant: "hero" as const },
    },
  ];

  return (
    <section id="features" className="bg-section py-16 sm:py-20">
      <div className="container-wide section-padding">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Choose your level
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Start free, upgrade when you're ready for complete protection.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {tiers.map((tier, index) => (
            <div
              key={index}
              className={`relative rounded-2xl p-6 transition-all ${
                tier.highlight
                  ? "bg-background border-2 border-primary shadow-soft-xl scale-[1.02]"
                  : "bg-background border border-border/50 shadow-soft"
              }`}
            >
              {tier.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-xs font-semibold bg-primary text-primary-foreground rounded-full">
                  Recommended
                </span>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-bold text-foreground">{tier.name}</h3>
                <p className="text-sm text-muted-foreground">{tier.subtitle}</p>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold text-foreground">{tier.price}</span>
                <span className="text-sm text-muted-foreground ml-2">{tier.priceNote}</span>
              </div>

              <ul className="space-y-3 mb-8">
                {tier.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start gap-3 text-sm">
                    <feature.icon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span className="text-foreground">{feature.label}</span>
                  </li>
                ))}
              </ul>

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

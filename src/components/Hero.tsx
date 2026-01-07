import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Wifi, Building2, Lock, Shield, AlertTriangle, Package, FileText } from "lucide-react";

const Hero = () => {
  const trustBullets = [
    { icon: Wifi, label: "Offline PWA — works without internet" },
    { icon: Building2, label: "Institutional guidance from official sources" },
    { icon: Lock, label: "Encrypted Vault + Red Folder (Premium)" },
  ];

  const previewCards = [
    {
      title: "Preparedness Score",
      value: "78%",
      icon: Shield,
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      title: "Risk Assessment",
      value: "Low-Medium",
      icon: AlertTriangle,
      color: "bg-amber-50 text-amber-600",
    },
    {
      title: "Supplies Plan",
      value: "14 Days",
      icon: Package,
      color: "bg-sky-50 text-sky-600",
    },
    {
      title: "Red Folder PDF",
      value: "Premium",
      icon: FileText,
      color: "bg-primary/10 text-primary",
      isPremium: true,
    },
  ];

  return (
    <section className="relative overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 gradient-subtle" />
      
      <div className="relative container-wide section-padding py-16 sm:py-20 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight text-balance animate-fade-in">
                Be prepared — even when the internet is down.
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground max-w-xl animate-fade-in [animation-delay:100ms] opacity-0">
                Your offline-first preparedness toolkit: risk assessment, 14-day essentials planning, 
                official guidance, and a Premium Red Folder PDF for critical moments.
              </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3 animate-fade-in [animation-delay:200ms] opacity-0">
              <Link to="/start">
                <Button variant="hero" size="xl">
                  Start Free
                </Button>
              </Link>
              <Link to="/pricing">
                <Button variant="hero-outline" size="xl">
                  View Pricing
                </Button>
              </Link>
            </div>

            {/* Trust Bullets */}
            <div className="space-y-3 animate-fade-in [animation-delay:300ms] opacity-0">
              {trustBullets.map((bullet, index) => (
                <div key={index} className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="p-1 rounded-md bg-primary/10">
                    <bullet.icon className="h-4 w-4 text-primary" />
                  </div>
                  <span>{bullet.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Product Preview */}
          <div className="lg:pl-8 animate-fade-in [animation-delay:400ms] opacity-0">
            <div className="relative">
              {/* Mock device frame */}
              <div className="bg-card rounded-2xl p-6 shadow-soft-xl border border-border/50">
                <div className="grid grid-cols-2 gap-4">
                  {previewCards.map((card, index) => (
                    <div
                      key={index}
                      className={`relative p-4 rounded-xl border border-border/50 bg-background transition-all hover:shadow-soft ${
                        card.isPremium ? "ring-1 ring-primary/20" : ""
                      }`}
                    >
                      {card.isPremium && (
                        <span className="absolute -top-2 -right-2 px-2 py-0.5 text-xs font-medium bg-primary text-primary-foreground rounded-full">
                          Premium
                        </span>
                      )}
                      <div className={`inline-flex p-2 rounded-lg ${card.color} mb-3`}>
                        <card.icon className="h-4 w-4" />
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">{card.title}</p>
                      <p className="font-semibold text-foreground">{card.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute -z-10 top-4 left-4 right-4 bottom-4 bg-primary/5 rounded-2xl" />
              <div className="absolute -z-20 top-8 left-8 right-8 bottom-8 bg-primary/3 rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;

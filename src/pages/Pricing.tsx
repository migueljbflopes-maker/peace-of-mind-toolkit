import { Link } from "react-router-dom";
import {
  FileText,
  Lock,
  Shield,
  Map,
  Download,
  Sparkles,
  User,
  Heart,
  ClipboardList,
  ArrowRight,
  Check,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Pricing = () => {
  const benefits = [
    {
      icon: FileText,
      title: "Printable offline PDF",
      description: "Your complete plan in Red Folder format — works without internet or power.",
    },
    {
      icon: Lock,
      title: "Encrypted Vault",
      description: "Securely store IDs, contacts, and medical basics with end-to-end encryption.",
    },
    {
      icon: Map,
      title: "Plans A & B",
      description: "Exit routes and emergency protocols for your household.",
    },
    {
      icon: Download,
      title: "Encrypted backup & restore",
      description: "Never lose your data — restore across devices anytime.",
    },
    {
      icon: Sparkles,
      title: "Premium insights",
      description: "Personalized explanations and next steps based on your situation.",
    },
  ];

  const previewSections = [
    { icon: ClipboardList, label: "Plan Summary" },
    { icon: User, label: "Contacts" },
    { icon: Heart, label: "Medical" },
    { icon: FileText, label: "Essentials Checklist" },
    { icon: Map, label: "Plans A/B" },
  ];

  const handleUnlockPremium = () => {
    // Placeholder for Stripe integration
    // TODO: Connect to Stripe payment flow
    console.log("Unlock Premium clicked - wire to payment flow");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-20">
        {/* Hero Section */}
        <section className="py-10 md:py-14">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center">
              {/* Badge */}
              <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-semibold px-3 py-1 rounded-full mb-4">
                <Lock className="h-3.5 w-3.5" />
                Premium
              </div>

              {/* Title */}
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                Personalized Resiliency Plan
              </h1>

              {/* Price */}
              <div className="mb-4">
                <span className="text-3xl md:text-4xl font-bold text-foreground">€49</span>
                <span className="text-base text-muted-foreground ml-2">one-time</span>
              </div>

              <p className="text-sm text-muted-foreground mb-6">
                No subscription. No recurring fees. Yours forever.
              </p>

              {/* Primary CTA */}
              <Button size="lg" onClick={handleUnlockPremium} className="gap-2 mb-6">
                Unlock Premium (€49)
                <ArrowRight className="h-4 w-4" />
              </Button>

              {/* Reassurance */}
              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <WifiOff className="h-3.5 w-3.5" />
                  <span>Offline-first</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5" />
                  <span>Privacy by design</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Preview Grid */}
        <section className="bg-section-light py-8">
          <div className="container mx-auto px-4">
            <p className="text-xs font-medium text-muted-foreground text-center mb-4 uppercase tracking-wide">
              What's included in your plan
            </p>
            <div className="grid grid-cols-5 gap-2 max-w-lg mx-auto">
              {previewSections.map((section, index) => {
                const IconComponent = section.icon;
                return (
                  <div
                    key={index}
                    className="bg-card rounded-lg border border-border p-3 text-center"
                  >
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-2">
                      <IconComponent className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-[10px] font-medium text-foreground leading-tight block">
                      {section.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-10">
          <div className="container mx-auto px-4">
            <h2 className="text-lg font-semibold text-foreground text-center mb-6">
              What you get
            </h2>
            <div className="max-w-xl mx-auto space-y-4">
              {benefits.map((benefit, index) => {
                const IconComponent = benefit.icon;
                return (
                  <div
                    key={index}
                    className="flex items-start gap-4 bg-card rounded-xl border border-border p-4"
                  >
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                      <IconComponent className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-0.5">
                        {benefit.title}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {benefit.description}
                      </p>
                    </div>
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="bg-gradient-to-br from-primary/5 to-primary/10 py-10">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Ready to be prepared?
            </h2>
            <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
              Your personalized plan, encrypted and always accessible — even offline.
            </p>
            <Button size="lg" onClick={handleUnlockPremium} className="gap-2 mb-4">
              Unlock Premium (€49)
              <ArrowRight className="h-4 w-4" />
            </Button>
            <p className="text-xs text-muted-foreground">
              One-time purchase. No subscription.
            </p>
          </div>
        </section>

        {/* Trust/Privacy Note */}
        <section className="py-8">
          <div className="container mx-auto px-4">
            <div className="max-w-lg mx-auto bg-muted/30 rounded-xl p-5 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">
                  Your data stays yours
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Everything is encrypted end-to-end. We can't read your data, and it works offline.
                No tracking, no ads, no selling your information.
              </p>
            </div>
          </div>
        </section>

        {/* Free Tools Reminder */}
        <section className="pb-10">
          <div className="container mx-auto px-4 text-center">
            <p className="text-xs text-muted-foreground mb-3">
              Not ready for Premium? Our core tools are always free.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link
                to="/tools/risk"
                className="text-xs text-primary hover:underline"
              >
                Risk Calculator
              </Link>
              <Link
                to="/tools/supplies"
                className="text-xs text-primary hover:underline"
              >
                Supplies Planner
              </Link>
              <Link
                to="/library"
                className="text-xs text-primary hover:underline"
              >
                Library
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Pricing;

import { useState } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  Lock,
  Shield,
  Map,
  Download,
  ArrowRight,
  Check,
  CheckCircle2,
  Loader2,
  Bell,
  Target,
  ClipboardList,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useEntitlements } from "@/hooks/useEntitlements";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Pricing = () => {
  const { isAuthenticated, user } = useAuth();
  const { isPremium } = useEntitlements();
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const handleUnlockPremium = async () => {
    setCheckoutLoading(true);
    try {
      const functionName = isAuthenticated && user 
        ? "create-checkout-session"
        : "create-guest-checkout";
      
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { source: "pricing" }
      });
      
      if (error) {
        console.error("Checkout error:", error);
        toast.error("Failed to start checkout. Please try again.");
        return;
      }

      if (data?.url) {
        window.open(data.url, '_blank');
      } else {
        toast.error("No checkout URL received. Please try again.");
      }
    } catch (err) {
      console.error("Checkout exception:", err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  // The 4-step journey
  const journeySteps = [
    {
      step: 1,
      label: "Assess",
      title: "Know Your Risks",
      description: "Understand your personal risk profile based on location and situation.",
      icon: Target,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      free: true,
    },
    {
      step: 2,
      label: "Prepare",
      title: "Build Your Plan",
      description: "14-day supplies checklist and personalized Plans A & B.",
      icon: ClipboardList,
      color: "text-amber-600",
      bgColor: "bg-amber-100",
      free: false,
    },
    {
      step: 3,
      label: "Secure",
      title: "Store & Protect",
      description: "Encrypted Vault for documents, contacts, and medical info.",
      icon: Lock,
      color: "text-emerald-600",
      bgColor: "bg-emerald-100",
      free: false,
    },
    {
      step: 4,
      label: "Activate",
      title: "Act When Needed",
      description: "One-tap Panic Button alerts your trusted contacts instantly.",
      icon: Bell,
      color: "text-red-600",
      bgColor: "bg-red-100",
      free: false,
    },
  ];

  // Premium users view
  if (isAuthenticated && isPremium) {
    const premiumFeatures = [
      { icon: Lock, label: "Encrypted Vault", href: "/premium/vault" },
      { icon: Map, label: "Plans A & B", href: "/premium/plans" },
      { icon: FileText, label: "Red Folder PDF", href: "/premium/red-folder" },
      { icon: Download, label: "Backup & Restore", href: "/premium/backup" },
      { icon: Bell, label: "Panic Button", href: "/panic/setup" },
    ];

    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-20">
          <section className="py-12">
            <div className="container mx-auto px-4">
              <div className="max-w-md mx-auto text-center">
                <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-7 w-7 text-primary" />
                </div>
                <h1 className="text-xl font-bold text-foreground mb-2">
                  You're already Premium
                </h1>
                <p className="text-sm text-muted-foreground mb-6">
                  Access all your premium features below.
                </p>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {premiumFeatures.map((feature, index) => {
                    const IconComponent = feature.icon;
                    return (
                      <Link
                        key={index}
                        to={feature.href}
                        className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl hover:border-primary/50 transition-colors"
                      >
                        <IconComponent className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium text-foreground">{feature.label}</span>
                      </Link>
                    );
                  })}
                </div>
                <Link to="/dashboard">
                  <Button className="gap-2">
                    Go to Dashboard
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-16">
        {/* Compact Hero */}
        <section className="py-10 md:py-12">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                Complete Preparedness Bundle
              </h1>
              <p className="text-muted-foreground mb-6">
                From risk assessment to emergency response — one purchase, lifetime access.
              </p>
              
              {/* Price inline */}
              <div className="inline-flex items-center gap-3 bg-card border border-border rounded-full px-6 py-3 mb-6">
                <span className="text-2xl font-bold text-foreground">€49</span>
                <span className="text-sm text-muted-foreground">one-time • no subscription</span>
              </div>
            </div>
          </div>
        </section>

        {/* 4-Step Journey */}
        <section className="py-10 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center mb-8">
                Your preparedness journey
              </p>
              
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {journeySteps.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.step}
                      className="relative bg-card border border-border rounded-xl p-5 text-center"
                    >
                      {/* Step number */}
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="inline-flex items-center justify-center w-6 h-6 bg-foreground text-background text-xs font-bold rounded-full">
                          {item.step}
                        </span>
                      </div>
                      
                      {/* Icon */}
                      <div className={`w-12 h-12 ${item.bgColor} rounded-xl flex items-center justify-center mx-auto mt-2 mb-3`}>
                        <Icon className={`h-6 w-6 ${item.color}`} />
                      </div>
                      
                      {/* Label */}
                      <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${item.color}`}>
                        {item.label}
                      </p>
                      
                      {/* Title */}
                      <h3 className="text-sm font-bold text-foreground mb-2">
                        {item.title}
                      </h3>
                      
                      {/* Description */}
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {item.description}
                      </p>
                      
                      {/* Free/Premium badge */}
                      <div className="mt-3">
                        {item.free ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full">
                            <Check className="h-3 w-3" />
                            Free
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
                            <Zap className="h-3 w-3" />
                            Premium
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* What's Included - Compact */}
        <section className="py-10">
          <div className="container mx-auto px-4">
            <div className="max-w-xl mx-auto">
              <h2 className="text-lg font-bold text-foreground text-center mb-6">
                What's in Premium
              </h2>
              
              <div className="space-y-3">
                {[
                  { icon: Lock, title: "Encrypted Vault", desc: "Store IDs, contacts, medical info securely" },
                  { icon: Map, title: "Plans A & B", desc: "AI-assisted exit routes and emergency protocols" },
                  { icon: FileText, title: "Red Folder PDF", desc: "Printable offline document for emergencies" },
                  { icon: Bell, title: "Panic Button", desc: "One-tap alerts to your trusted contacts" },
                  { icon: Download, title: "Backup & Restore", desc: "Encrypted cloud sync across devices" },
                ].map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div key={idx} className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                      <Check className="h-4 w-4 text-primary shrink-0" />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-10 bg-primary/5">
          <div className="container mx-auto px-4">
            <div className="max-w-md mx-auto text-center">
              <h2 className="text-xl font-bold text-foreground mb-2">
                Get lifetime access
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                One payment. No subscription. Works offline.
              </p>
              
              <Button 
                size="lg" 
                onClick={handleUnlockPremium} 
                disabled={checkoutLoading}
                className="gap-2 h-12 px-8 text-base font-semibold w-full sm:w-auto"
              >
                {checkoutLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Starting checkout...
                  </>
                ) : (
                  <>
                    Unlock Premium — €49
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </Button>
              
              <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Shield className="h-3.5 w-3.5" />
                  Secure payment
                </span>
                <span className="flex items-center gap-1">
                  <Lock className="h-3.5 w-3.5" />
                  End-to-end encrypted
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Free Tools */}
        <section className="py-8">
          <div className="container mx-auto px-4 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              Not ready? Start with our free tools.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link to="/tools/risk" className="text-sm text-primary hover:underline font-medium">
                Risk Calculator
              </Link>
              <span className="text-muted-foreground">•</span>
              <Link to="/tools/supplies" className="text-sm text-primary hover:underline font-medium">
                Supplies Planner
              </Link>
              <span className="text-muted-foreground">•</span>
              <Link to="/library" className="text-sm text-primary hover:underline font-medium">
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

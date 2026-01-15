import { useState } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  Lock,
  Shield,
  Map,
  Download,
  Sparkles,
  User,
  ArrowRight,
  Check,
  WifiOff,
  CheckCircle2,
  Loader2,
  Bell,
  MapPin,
  History,
  Zap,
  Clock,
  Heart,
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

  // Premium users see a different view
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
          <section className="py-16">
            <div className="container mx-auto px-4">
              <div className="max-w-md mx-auto text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="h-8 w-8 text-primary" />
                </div>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  You're already Premium
                </h1>
                <p className="text-muted-foreground mb-8">
                  Thank you for your support! Access all your premium features below.
                </p>

                <div className="grid grid-cols-2 gap-3 mb-8">
                  {premiumFeatures.map((feature, index) => {
                    const IconComponent = feature.icon;
                    return (
                      <Link
                        key={index}
                        to={feature.href}
                        className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl hover:border-primary/50 transition-colors"
                      >
                        <IconComponent className="h-5 w-5 text-primary" />
                        <span className="text-sm font-medium text-foreground">{feature.label}</span>
                      </Link>
                    );
                  })}
                </div>

                <Link to="/dashboard">
                  <Button size="lg" className="gap-2">
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

      <main className="pt-20">
        {/* Hero Section - Redesigned */}
        <section className="relative overflow-hidden py-16 md:py-20">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
          
          <div className="container mx-auto px-4 relative">
            <div className="max-w-3xl mx-auto text-center">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-medium px-4 py-2 rounded-full mb-6">
                <Zap className="h-4 w-4" />
                <span>One-time purchase • Yours forever</span>
              </div>

              {/* Title */}
              <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
                Complete Peace of Mind
                <span className="block text-primary">Premium Bundle</span>
              </h1>
              
              <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
                Two powerful pillars of preparedness. One payment. No subscription.
              </p>

              {/* Price Card */}
              <div className="bg-card border-2 border-primary/20 rounded-2xl p-8 max-w-sm mx-auto mb-8 shadow-lg shadow-primary/5">
                <div className="flex items-baseline justify-center gap-2 mb-2">
                  <span className="text-5xl md:text-6xl font-bold text-foreground">€49</span>
                  <span className="text-lg text-muted-foreground">one-time</span>
                </div>
                <p className="text-sm text-muted-foreground mb-6">
                  No recurring fees. No hidden costs.
                </p>
                
                <Button 
                  size="lg" 
                  onClick={handleUnlockPremium} 
                  disabled={checkoutLoading}
                  className="w-full gap-2 h-14 text-base font-semibold"
                >
                  {checkoutLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Starting checkout...
                    </>
                  ) : (
                    <>
                      Unlock Premium Now
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </Button>

                {/* Trust badges inside card */}
                <div className="flex items-center justify-center gap-6 mt-6 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Shield className="h-4 w-4 text-primary" />
                    <span>Secure payment</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-primary" />
                    <span>Instant access</span>
                  </div>
                </div>
              </div>

              {/* Core values */}
              <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <WifiOff className="h-4 w-4 text-primary" />
                  <span>Works offline</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-primary" />
                  <span>End-to-end encrypted</span>
                </div>
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-primary" />
                  <span>Privacy by design</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Two Pillars Section - Enhanced */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <p className="text-sm font-semibold text-primary uppercase tracking-wide mb-2">
                What's included
              </p>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                Two Pillars, One Bundle
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {/* Safe Toolkit Pillar */}
              <div className="bg-card rounded-2xl border border-border p-8 hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl flex items-center justify-center">
                    <Shield className="h-7 w-7 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">Safe Toolkit</h3>
                    <p className="text-sm text-muted-foreground">Prepare & protect</p>
                  </div>
                </div>
                <ul className="space-y-4">
                  {[
                    { icon: Lock, label: "Encrypted Vault", desc: "Store IDs, contacts, medical info securely" },
                    { icon: Map, label: "Plans A & B", desc: "Exit routes and emergency protocols" },
                    { icon: FileText, label: "Red Folder PDF", desc: "Printable offline document" },
                    { icon: Download, label: "Backup & Restore", desc: "Never lose your data" },
                  ].map((feature, idx) => {
                    const Icon = feature.icon;
                    return (
                      <li key={idx} className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <span className="text-sm font-medium text-foreground block">{feature.label}</span>
                          <span className="text-xs text-muted-foreground">{feature.desc}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Panic Button Pillar */}
              <div className="bg-card rounded-2xl border border-border p-8 hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 bg-gradient-to-br from-destructive/20 to-destructive/10 rounded-xl flex items-center justify-center">
                    <Bell className="h-7 w-7 text-destructive" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">Panic Button</h3>
                    <p className="text-sm text-muted-foreground">Respond & alert</p>
                  </div>
                </div>
                <ul className="space-y-4">
                  {[
                    { icon: Zap, label: "One-tap emergency alerts", desc: "Activate in seconds" },
                    { icon: User, label: "Notify trusted contacts", desc: "Automatic notifications" },
                    { icon: MapPin, label: "Location sharing", desc: "Share your position when needed" },
                    { icon: History, label: "Activation history", desc: "Track all activations" },
                  ].map((feature, idx) => {
                    const Icon = feature.icon;
                    return (
                      <li key={idx} className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-destructive/10 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                          <Icon className="h-4 w-4 text-destructive" />
                        </div>
                        <div>
                          <span className="text-sm font-medium text-foreground block">{feature.label}</span>
                          <span className="text-xs text-muted-foreground">{feature.desc}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Grid */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                Everything you need
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                One purchase unlocks the complete preparedness toolkit
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
              {[
                { icon: FileText, title: "Printable PDF", desc: "Works without internet or power" },
                { icon: Lock, title: "End-to-end encryption", desc: "Only you can read your data" },
                { icon: WifiOff, title: "Offline-first", desc: "Full functionality without internet" },
                { icon: Download, title: "Cloud backup", desc: "Encrypted sync across devices" },
                { icon: Sparkles, title: "AI-assisted plans", desc: "Personalized recommendations" },
                { icon: Shield, title: "Privacy focused", desc: "No tracking, no ads, no data selling" },
              ].map((benefit, idx) => {
                const Icon = benefit.icon;
                return (
                  <div key={idx} className="flex items-start gap-4 p-5 bg-card rounded-xl border border-border">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-1">{benefit.title}</h3>
                      <p className="text-xs text-muted-foreground">{benefit.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Comparison / Value Prop */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-10">
                <h2 className="text-2xl font-bold text-foreground mb-3">
                  Why choose Premium?
                </h2>
              </div>

              <div className="bg-card rounded-2xl border border-border overflow-hidden">
                <div className="grid grid-cols-2">
                  <div className="p-6 border-r border-border">
                    <p className="text-sm font-medium text-muted-foreground mb-4">Free Tools</p>
                    <ul className="space-y-3">
                      {["Risk Calculator", "14-Day Supplies Plan", "Tips & Guidance", "Weekly Briefing"].map((item, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm text-foreground">
                          <Check className="h-4 w-4 text-primary" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-6 bg-primary/5">
                    <p className="text-sm font-medium text-primary mb-4">Premium Bundle</p>
                    <ul className="space-y-3">
                      {["Everything in Free", "Encrypted Vault", "Plans A & B", "Red Folder PDF", "Panic Button", "Backup & Restore"].map((item, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm text-foreground">
                          <Check className="h-4 w-4 text-primary" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-xl mx-auto text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                Ready to be prepared?
              </h2>
              <p className="text-muted-foreground mb-8">
                Join thousands who've secured their family's peace of mind.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
                <Button 
                  size="lg" 
                  onClick={handleUnlockPremium} 
                  disabled={checkoutLoading}
                  className="gap-2 h-14 px-8 text-base font-semibold"
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
              </div>

              <p className="text-xs text-muted-foreground">
                One-time purchase. No subscription. Instant access.
              </p>
            </div>
          </div>
        </section>

        {/* Trust/Privacy */}
        <section className="py-8 border-t border-border">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-4 text-center sm:text-left">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground mb-1">
                  Your data stays yours
                </p>
                <p className="text-xs text-muted-foreground">
                  End-to-end encryption means we can't read your data. It works offline, and we never track, advertise, or sell your information.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Free Tools Reminder */}
        <section className="py-8 bg-muted/30">
          <div className="container mx-auto px-4 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Not ready for Premium? Our core tools are always free.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/tools/risk"
                className="text-sm text-primary hover:underline font-medium"
              >
                Risk Calculator
              </Link>
              <span className="text-muted-foreground">•</span>
              <Link
                to="/tools/supplies"
                className="text-sm text-primary hover:underline font-medium"
              >
                Supplies Planner
              </Link>
              <span className="text-muted-foreground">•</span>
              <Link
                to="/library"
                className="text-sm text-primary hover:underline font-medium"
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

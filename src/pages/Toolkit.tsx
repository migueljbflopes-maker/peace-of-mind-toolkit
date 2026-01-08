import { Link } from "react-router-dom";
import { Shield, Lock, FileText, FolderHeart, ArrowRight, Check, AlertCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useEntitlements } from "@/hooks/useEntitlements";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";

const Toolkit = () => {
  const { user, loading: authLoading } = useAuth();
  const { isPremium, loading: entLoading } = useEntitlements(user, authLoading);
  const loading = authLoading || entLoading;

  const features = [
    {
      icon: Lock,
      title: "Encrypted Vault",
      description: "Store IDs, contacts, medical info — encrypted locally with your passphrase.",
      href: "/premium/vault",
    },
    {
      icon: FileText,
      title: "Plan A & Plan B",
      description: "AI-generated action plans: one for staying, one for relocating.",
      href: "/premium/plans",
    },
    {
      icon: FolderHeart,
      title: "Red Folder PDF",
      description: "Printable offline document with everything in one place.",
      href: "/premium/red-folder",
    },
  ];

  const panicFeature = {
    icon: AlertCircle,
    title: "Panic Button",
    description: "Alert your emergency contacts instantly with your location and scenario.",
    href: "/panic/setup",
  };

  const benefits = [
    "Works offline — no internet needed in emergencies",
    "End-to-end encrypted — we can't read your data",
    "One-time purchase — no subscriptions, no recurring fees",
    "Multi-device sync — access from any device",
  ];

  // Premium user view - show access to features
  if (isPremium && !loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main>
          {/* Hero for Premium Users */}
          <section className="relative py-12 md:py-16 bg-gradient-to-b from-primary/5 to-background">
            <div className="container mx-auto px-4 text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Shield className="h-4 w-4" />
                Premium Active
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Your Safe Toolkit
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                Access your premium features below.
              </p>
            </div>
          </section>

          {/* Features Grid - Clickable for Premium */}
          <section className="py-12 bg-section">
            <div className="container mx-auto px-4">
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
                {[...features, panicFeature].map((feature) => (
                  <Link key={feature.title} to={feature.href}>
                    <Card className="border-border/50 h-full hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
                      <CardContent className="pt-6">
                        <div className="p-3 rounded-xl bg-primary/10 w-fit mb-4">
                          <feature.icon className="h-6 w-6 text-primary" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground mb-2">
                          {feature.title}
                        </h3>
                        <p className="text-muted-foreground text-sm">
                          {feature.description}
                        </p>
                        <div className="mt-4 flex items-center gap-1 text-primary text-sm font-medium">
                          Open <ArrowRight className="h-4 w-4" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          {/* Quick Links */}
          <section className="py-12">
            <div className="container mx-auto px-4 text-center">
              <div className="flex flex-wrap justify-center gap-4">
                <Link to="/premium/backup">
                  <Button variant="outline">Backup & Restore</Button>
                </Link>
                <Link to="/dashboard">
                  <Button variant="outline">Go to Dashboard</Button>
                </Link>
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="py-16">
          <div className="container mx-auto px-4">
            <Skeleton className="h-64 w-full max-w-3xl mx-auto" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Non-premium view - show marketing page
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        {/* Hero */}
        <section className="relative py-16 md:py-24 bg-gradient-to-b from-primary/5 to-background">
          <div className="container mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Shield className="h-4 w-4" />
              Premium Feature
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
              Your Safe Toolkit
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Everything you need for peace of mind — Vault, Plans, Panic Button, and a printable Red Folder. 
              Encrypted. Offline-ready. Always yours.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/pricing">
                <Button variant="cta" size="lg" className="gap-2">
                  Get Safe Toolkit — €49
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/tools/risk">
                <Button variant="outline" size="lg">
                  Try Free Risk Check First
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-16 bg-section">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-12">
              What's Included
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {[...features, panicFeature].map((feature) => (
                <Card key={feature.title} className="border-border/50">
                  <CardContent className="pt-6">
                    <div className="p-3 rounded-xl bg-primary/10 w-fit mb-4">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold text-foreground mb-8 text-center">
                Why Safe Toolkit?
              </h2>
              <div className="space-y-4">
                {benefits.map((benefit) => (
                  <div key={benefit} className="flex items-start gap-3">
                    <div className="p-1 rounded-full bg-primary/10 mt-0.5">
                      <Check className="h-4 w-4 text-primary" />
                    </div>
                    <p className="text-foreground">{benefit}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-primary/5">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              Ready to be prepared?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              One-time purchase. No subscription. Lifetime access.
            </p>
            <Link to="/pricing">
              <Button variant="cta" size="lg" className="gap-2">
                Get Safe Toolkit — €49
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Toolkit;

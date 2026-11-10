import { Link } from "react-router-dom";
import { AlertCircle, Shield, Clock, Users, Send, ArrowRight, Check } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocale } from "@/i18n";

const Panic = () => {
  const { t } = useLocale();
  const features = [
    {
      icon: AlertCircle,
      title: "Emergency Scenarios",
      description: "Define custom triggers: medical emergency, natural disaster, security threat.",
    },
    {
      icon: Users,
      title: "Emergency Contacts",
      description: "Select who receives your critical info when the button is activated.",
    },
    {
      icon: Send,
      title: "Instant Sharing",
      description: "Location, medical info, and emergency contacts shared with one action.",
    },
  ];

  const safetyFeatures = [
    "Hold-to-activate prevents accidental triggers",
    "5-second cancel window after activation",
    "Test mode to verify setup without alerting contacts",
    t.panic.requiresConnection,
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        {/* Hero */}
        <section className="relative py-16 md:py-24 bg-gradient-to-b from-destructive/5 to-background">
          <div className="container mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/10 text-destructive text-sm font-medium mb-6">
              <AlertCircle className="h-4 w-4" />
              Emergency Feature
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
              Panic Button & Continuity
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              In an emergency, share critical information with your trusted contacts instantly. 
              One action. Maximum peace of mind.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/panic/setup">
                <Button variant="cta" size="lg" className="gap-2">
                  Set Up Panic Button
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/toolkit">
                <Button variant="outline" size="lg">
                  Learn About Safe Toolkit
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 bg-section">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-12">
              How It Works
            </h2>
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {features.map((feature, index) => (
                <Card key={feature.title} className="border-border/50 relative">
                  <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </div>
                  <CardContent className="pt-8">
                    <div className="p-3 rounded-xl bg-destructive/10 w-fit mb-4">
                      <feature.icon className="h-6 w-6 text-destructive" />
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

        {/* Safety Features */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center gap-3 justify-center mb-8">
                <Shield className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold text-foreground">
                  Built-in Safety
                </h2>
              </div>
              <div className="space-y-4">
                {safetyFeatures.map((feature) => (
                  <div key={feature} className="flex items-start gap-3">
                    <div className="p-1 rounded-full bg-primary/10 mt-0.5">
                      <Check className="h-4 w-4 text-primary" />
                    </div>
                    <p className="text-foreground">{feature}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-destructive/5">
          <div className="container mx-auto px-4 text-center">
            <Clock className="h-10 w-10 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              Set it up before you need it
            </h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Takes 5 minutes. Works when it matters most.
            </p>
            <Link to="/panic/setup">
              <Button variant="cta" size="lg" className="gap-2">
                Set Up Panic Button
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

export default Panic;

import { Link } from "react-router-dom";
import { 
  AlertTriangle, 
  Package, 
  BookOpen, 
  ArrowRight, 
  Droplets, 
  Zap, 
  Pill,
  Lock,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const BePrepared = () => {
  const featuredTools = [
    {
      icon: AlertTriangle,
      title: "Risk Calculator",
      description: "Get a practical local risk score in 2 minutes.",
      href: "/tools/risk",
      cta: "Start Risk Calculator",
    },
    {
      icon: Package,
      title: "14-Day Supplies Planner",
      description: "Generate a clear essentials list for your household.",
      href: "/tools/supplies",
      cta: "Build supplies plan",
    },
  ];

  const comingSoonTools = [
    {
      icon: Zap,
      title: "Power & Communications",
      description: "Plan for outages and connectivity.",
    },
    {
      icon: Pill,
      title: "Medication & Special Needs",
      description: "Track medical requirements.",
    },
    {
      icon: Droplets,
      title: "Water & Food Coverage",
      description: "Calculate your household's needs.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-20">
        {/* Hero Section */}
        <section className="bg-section-light py-10">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
                Be Prepared
              </h1>
              <p className="text-lg text-muted-foreground mb-6">
                Start with a 2-minute risk check, then build your essentials plan.
              </p>
              
              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-4">
                <Link to="/tools/risk">
                  <Button size="lg" className="gap-2">
                    Start Risk Calculator
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link 
                  to="/tools/supplies"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors underline underline-offset-4"
                >
                  Build supplies plan
                </Link>
              </div>
              
              <Link 
                to="/library" 
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <BookOpen className="h-4 w-4" />
                Explore official guidance
              </Link>
            </div>
          </div>
        </section>

        {/* Featured Tools */}
        <section className="py-8">
          <div className="container mx-auto px-4">
            <p className="text-sm font-medium text-muted-foreground text-center mb-5">
              Start with a calculator
            </p>
            <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
              {featuredTools.map((tool, index) => {
                const IconComponent = tool.icon;
                return (
                  <Link key={index} to={tool.href} className="block">
                    <div className="bg-card rounded-xl p-5 border border-primary/20 hover:border-primary/40 hover:shadow-md transition-all h-full">
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <IconComponent className="h-5 w-5 text-primary" />
                        </div>
                        <div className="text-xs text-primary bg-primary/10 px-2 py-1 rounded-full font-medium">
                          Free
                        </div>
                      </div>
                      <h3 className="text-base font-semibold text-foreground mb-1">
                        {tool.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        {tool.description}
                      </p>
                      <Button size="sm" className="w-full gap-2">
                        {tool.cta}
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* Premium Teaser Strip */}
        <section className="py-6">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto bg-primary/5 rounded-xl p-6 border-2 border-primary/30">
              <div className="flex items-center justify-center gap-2 mb-3">
                <div className="flex items-center gap-1.5 bg-primary/15 text-primary text-xs font-semibold px-2.5 py-1 rounded-full">
                  <Lock className="h-3 w-3" />
                  Premium
                </div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground">
                    Red Folder: a printable, offline-ready plan.
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  One-time purchase: €49 (no subscription).
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  Red Folder PDF • Vault • Plans A & B
                </p>
                <Link to="/pricing">
                  <Button size="default" className="gap-2">
                    Unlock Premium
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Coming Soon Tools */}
        <section className="bg-section-light py-8">
          <div className="container mx-auto px-4">
            <h2 className="text-sm font-medium text-muted-foreground text-center mb-5">
              More tools (coming soon)
            </h2>
            <div className="grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
              {comingSoonTools.map((tool, index) => {
                const IconComponent = tool.icon;
                return (
                  <div
                    key={index}
                    className="bg-muted/30 rounded-xl p-4 border border-border opacity-60"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                        <IconComponent className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                        Coming soon
                      </div>
                    </div>
                    <h3 className="text-base font-semibold text-muted-foreground mb-1">
                      {tool.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {tool.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default BePrepared;

import { Link } from "react-router-dom";
import { 
  AlertTriangle, 
  Package, 
  BookOpen, 
  ArrowRight, 
  Zap, 
  Pill,
  Lock,
  FileText,
  Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AmazonProductsSection from "@/components/AmazonProductsSection";

const BePrepared = () => {
  const featuredTools = [
    {
      icon: AlertTriangle,
      title: "Risk Calculator",
      description: "Get a practical local risk score in 2 minutes.",
      href: "/tools/risk",
      cta: "Start Risk Calculator",
      featured: true,
    },
    {
      icon: Package,
      title: "14-Day Supplies Planner",
      description: "Generate a clear essentials list for your household.",
      href: "/tools/supplies",
      cta: "Build supplies plan",
      featured: false,
    },
  ];

  const comingSoonTools = [
    {
      icon: Zap,
      title: "Power & Communications",
      description: "Plan for outages.",
    },
    {
      icon: Pill,
      title: "Medication & Special Needs",
      description: "Track medical requirements.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-20">
        {/* Hero Section - Compact */}
        <section className="bg-section-light py-8 md:py-10">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                Be Prepared
              </h1>
              <p className="text-base text-muted-foreground mb-5">
                Start with a 2-minute risk check, then build your essentials plan.
              </p>
              
              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-3">
                <Link to="/tools/risk">
                  <Button size="default" className="gap-2">
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
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <BookOpen className="h-3.5 w-3.5" />
                Explore official guidance
              </Link>
            </div>
          </div>
        </section>

        {/* Featured Tools - Tight spacing */}
        <section className="py-6">
          <div className="container mx-auto px-4">
            <p className="text-xs font-medium text-muted-foreground text-center mb-4 uppercase tracking-wide">
              Start with a calculator
            </p>
            <div className="grid sm:grid-cols-2 gap-4 max-w-xl mx-auto">
              {featuredTools.map((tool, index) => {
                const IconComponent = tool.icon;
                return (
                  <Link key={index} to={tool.href} className="block">
                    <div className={`bg-card rounded-xl p-4 border hover:shadow-md transition-all h-full ${
                      tool.featured 
                        ? 'border-primary/30 hover:border-primary/50' 
                        : 'border-border hover:border-primary/30'
                    }`}>
                      <div className="flex items-start justify-between mb-2">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                          tool.featured ? 'bg-primary/15' : 'bg-primary/10'
                        }`}>
                          <IconComponent className={`h-4.5 w-4.5 ${
                            tool.featured ? 'text-primary' : 'text-primary/80'
                          }`} />
                        </div>
                        {tool.featured ? (
                          <div className="flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full font-medium">
                            <Star className="h-3 w-3 fill-primary" />
                            Featured
                          </div>
                        ) : (
                          <div className="text-xs text-primary/70 bg-primary/5 px-2 py-0.5 rounded-full">
                            Free
                          </div>
                        )}
                      </div>
                      <h3 className="text-sm font-semibold text-foreground mb-1">
                        {tool.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mb-3">
                        {tool.description}
                      </p>
                      <Button 
                        size="sm" 
                        variant={tool.featured ? "default" : "outline"}
                        className="w-full gap-1.5 text-xs h-8"
                      >
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

        {/* Products Section */}
        <AmazonProductsSection />

        {/* Premium Teaser - Prominent but calm */}
        <section className="py-5">
          <div className="container mx-auto px-4">
            <div className="max-w-xl mx-auto bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-5 border border-primary/20 shadow-sm">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="flex items-center gap-1 bg-primary/20 text-primary text-xs font-semibold px-2 py-0.5 rounded-full">
                  <Lock className="h-3 w-3" />
                  Premium
                </div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1.5">
                  <FileText className="h-4 w-4 text-primary" />
                  <h3 className="text-base font-semibold text-foreground">
                    Red Folder: printable plan for offline peace of mind.
                  </h3>
                </div>
                <p className="text-sm text-foreground/80 font-medium mb-2">
                  €49 one-time purchase • No subscription
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  Red Folder PDF • Vault • Plans A & B
                </p>
                <Link to="/pricing">
                  <Button size="sm" className="gap-1.5">
                    Unlock Premium
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Coming Soon Tools - Clearly secondary */}
        <section className="bg-section-light py-6">
          <div className="container mx-auto px-4">
            <p className="text-xs font-medium text-muted-foreground text-center mb-4 uppercase tracking-wide">
              More tools (coming soon)
            </p>
            <div className="grid sm:grid-cols-2 gap-3 max-w-md mx-auto">
              {comingSoonTools.map((tool, index) => {
                const IconComponent = tool.icon;
                return (
                  <div
                    key={index}
                    className="bg-muted/20 rounded-lg p-3 border border-border/50 opacity-50 cursor-not-allowed"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-7 h-7 bg-muted/50 rounded-md flex items-center justify-center">
                        <IconComponent className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                        Coming soon
                      </span>
                    </div>
                    <h3 className="text-xs font-medium text-muted-foreground">
                      {tool.title}
                    </h3>
                    <p className="text-[10px] text-muted-foreground/70">
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

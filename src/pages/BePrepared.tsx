import { Link } from "react-router-dom";
import { 
  AlertTriangle, 
  Package, 
  BookOpen, 
  ArrowRight, 
  Droplets, 
  FileText, 
  FolderLock, 
  Shield, 
  Zap, 
  Pill,
  Lock,
  ClipboardCheck,
  Target,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const BePrepared = () => {
  const howItWorksSteps = [
    {
      icon: Target,
      title: "Assess",
      description: "Understand your local risks in 2 minutes.",
    },
    {
      icon: ClipboardCheck,
      title: "Prepare",
      description: "Build a 14-day essentials plan for your household.",
    },
    {
      icon: Shield,
      title: "Secure",
      description: "Store your plan safely with Premium tools.",
    },
  ];

  const calculators = [
    {
      icon: AlertTriangle,
      title: "Risk Calculator",
      description: "Get a practical local risk score.",
      href: "/tools/risk",
      status: "featured" as const,
    },
    {
      icon: Package,
      title: "14-Day Supplies Planner",
      description: "Generate a clear essentials list.",
      href: "/tools/supplies",
      status: "featured" as const,
    },
    {
      icon: Droplets,
      title: "Water & Food Coverage",
      description: "Calculate your household's needs.",
      href: "/tools/water-food",
      status: "free" as const,
    },
    {
      icon: FileText,
      title: "Red Folder (PDF)",
      description: "Printable emergency documentation.",
      href: "/pricing",
      status: "premium" as const,
    },
    {
      icon: ClipboardCheck,
      title: "Plans A & B",
      description: "Structured evacuation & shelter plans.",
      href: "/pricing",
      status: "premium" as const,
    },
    {
      icon: FolderLock,
      title: "Vault",
      description: "Encrypted storage for critical docs.",
      href: "/pricing",
      status: "premium" as const,
    },
    {
      icon: Zap,
      title: "Power & Communications",
      description: "Plan for outages and connectivity.",
      href: "#",
      status: "coming-soon" as const,
    },
    {
      icon: Pill,
      title: "Medication & Special Needs",
      description: "Track medical requirements.",
      href: "#",
      status: "coming-soon" as const,
    },
  ];

  const getCardStyles = (status: string) => {
    switch (status) {
      case "featured":
        return "bg-card border-primary/20 hover:border-primary/40 hover:shadow-md";
      case "free":
        return "bg-card border-border hover:shadow-md";
      case "premium":
        return "bg-muted/50 border-border";
      case "coming-soon":
        return "bg-muted/30 border-border opacity-60";
      default:
        return "bg-card border-border";
    }
  };

  const renderCardContent = (calc: typeof calculators[0]) => {
    const IconComponent = calc.icon;
    
    if (calc.status === "premium") {
      return (
        <Link to={calc.href} className="block h-full">
          <div className="flex flex-col h-full">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center">
                <IconComponent className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                <Lock className="h-3 w-3" />
                Premium
              </div>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {calc.title}
            </h3>
            <p className="text-sm text-muted-foreground mb-4 flex-grow">
              {calc.description}
            </p>
            <Button variant="outline" size="sm" className="w-full gap-2">
              Unlock Premium
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </Link>
      );
    }

    if (calc.status === "coming-soon") {
      return (
        <div className="flex flex-col h-full cursor-not-allowed">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center">
              <IconComponent className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
              Coming soon
            </div>
          </div>
          <h3 className="text-lg font-semibold text-muted-foreground mb-2">
            {calc.title}
          </h3>
          <p className="text-sm text-muted-foreground mb-4 flex-grow">
            {calc.description}
          </p>
        </div>
      );
    }

    // Featured or Free
    return (
      <Link to={calc.href} className="block h-full">
        <div className="flex flex-col h-full">
          <div className="flex items-start justify-between mb-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              calc.status === "featured" ? "bg-primary/10" : "bg-muted"
            }`}>
              <IconComponent className={`h-6 w-6 ${
                calc.status === "featured" ? "text-primary" : "text-foreground"
              }`} />
            </div>
            {calc.status === "featured" && (
              <div className="text-xs text-primary bg-primary/10 px-2 py-1 rounded-full font-medium">
                Featured
              </div>
            )}
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {calc.title}
          </h3>
          <p className="text-sm text-muted-foreground mb-4 flex-grow">
            {calc.description}
          </p>
          <Button 
            variant={calc.status === "featured" ? "default" : "outline"} 
            size="sm" 
            className="w-full gap-2"
          >
            {calc.status === "featured" ? "Start now" : "Open"}
            <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-20">
        {/* Hero Section */}
        <section className="bg-section-light py-12 md:py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Be Prepared
              </h1>
              <p className="text-lg text-muted-foreground mb-8">
                A calm, practical plan you can rely on — even offline.
              </p>
              
              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
                <Link to="/tools/risk">
                  <Button size="lg" className="gap-2">
                    Start risk assessment
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/tools/supplies">
                  <Button variant="outline" size="lg" className="gap-2">
                    Build my supplies plan
                    <ArrowRight className="h-4 w-4" />
                  </Button>
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

        {/* Preparedness Widget */}
        <section className="py-8">
          <div className="container mx-auto px-4">
            <div className="max-w-md mx-auto">
              <div className="bg-card rounded-xl p-6 shadow-soft border border-border">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-muted rounded-xl flex items-center justify-center">
                    <CheckCircle2 className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <div className="flex-grow">
                    <h3 className="font-semibold text-foreground mb-1">Preparedness</h3>
                    <p className="text-sm text-muted-foreground">Not assessed yet</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-4 mb-4">
                  Start the Risk Calculator to get your baseline score.
                </p>
                <Link to="/tools/risk">
                  <Button variant="outline" size="sm" className="w-full gap-2">
                    Start risk assessment
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* How it Works */}
        <section className="py-10 md:py-12">
          <div className="container mx-auto px-4">
            <h2 className="text-xl font-semibold text-foreground text-center mb-8">
              How it works
            </h2>
            <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
              {howItWorksSteps.map((step, index) => (
                <div key={index} className="text-center">
                  <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <step.icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Calculators Grid */}
        <section className="bg-section-light py-12 md:py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-xl font-semibold text-foreground text-center mb-8">
              Calculators & Tools
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
              {calculators.map((calc, index) => (
                <div
                  key={index}
                  className={`rounded-xl p-5 border transition-all ${getCardStyles(calc.status)}`}
                >
                  {renderCardContent(calc)}
                </div>
              ))}
            </div>

            {/* Premium Teaser */}
            <div className="max-w-2xl mx-auto mt-10 text-center">
              <p className="text-muted-foreground">
                Premium turns your progress into printable, offline-ready documentation (Red Folder).
              </p>
              <Link to="/pricing" className="inline-block mt-4">
                <Button variant="outline" className="gap-2">
                  Learn about Premium
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Library Link Section */}
        <section className="py-10 md:py-12">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center">
              <h3 className="text-lg font-medium text-foreground mb-4">
                Prefer official guidance?
              </h3>
              <Link to="/library">
                <div className="inline-flex items-center gap-3 bg-card rounded-xl px-6 py-4 shadow-soft border border-border hover:shadow-md transition-shadow cursor-pointer">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-foreground">Library</p>
                    <p className="text-sm text-muted-foreground">
                      Curated institutional guidance
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground ml-2" />
                </div>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default BePrepared;

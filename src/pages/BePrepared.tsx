import { Link } from "react-router-dom";
import { AlertTriangle, Package, BookOpen, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const BePrepared = () => {
  // Placeholder progress - will be computed later
  const preparednessScore = 35;
  const showScore = true; // Set to false to show "—%"

  const calculators = [
    {
      icon: AlertTriangle,
      title: "Risk Calculator",
      description: "Get a practical local risk score in 2 minutes.",
      href: "/tools/risk",
      cta: "Start risk assessment",
    },
    {
      icon: Package,
      title: "14-Day Supplies Planner",
      description: "Generate a clear essentials list for your household.",
      href: "/tools/supplies",
      cta: "Build my supplies plan",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-20">
        {/* Hero Section */}
        <section className="bg-section-light py-12 md:py-16">
          <div className="container mx-auto px-4 text-center">
            {/* Progress Teaser Chip */}
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
              <div className="w-2 h-2 bg-primary rounded-full" />
              You're ~{showScore ? `${preparednessScore}%` : "—%"} prepared
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Be Prepared
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Start with a quick assessment, then build your 14-day essentials plan.
            </p>
          </div>
        </section>

        {/* Calculator Cards */}
        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {calculators.map((calc, index) => (
                <div
                  key={index}
                  className="bg-card rounded-xl p-8 shadow-soft border border-border hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mb-6">
                      <calc.icon className="h-8 w-8 text-primary" />
                    </div>
                    <h2 className="text-xl font-semibold text-foreground mb-3">
                      {calc.title}
                    </h2>
                    <p className="text-muted-foreground mb-6">
                      {calc.description}
                    </p>
                    <Link to={calc.href} className="w-full">
                      <Button className="w-full gap-2">
                        {calc.cta}
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Library Link Section */}
        <section className="bg-section-light py-10 md:py-12">
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

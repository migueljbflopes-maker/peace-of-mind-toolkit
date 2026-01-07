import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Lightbulb, ArrowRight, Heart, Coffee, Sun } from "lucide-react";

const TipsPreview = () => {
  const tipPreviews = [
    {
      icon: Heart,
      title: "Managing Anxiety About Emergencies",
      excerpt: "Simple techniques to stay calm while being prepared.",
    },
    {
      icon: Coffee,
      title: "The Weekend Preparedness Routine",
      excerpt: "Build habits that make readiness effortless.",
    },
    {
      icon: Sun,
      title: "Talking to Kids About Being Prepared",
      excerpt: "Age-appropriate ways to include the whole family.",
    },
  ];

  return (
    <section id="tips" className="container-wide section-padding py-16 sm:py-20">
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Lightbulb className="h-4 w-4" />
            Tips & Peace of Mind
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Preparedness without the stress
          </h2>
          <p className="text-lg text-muted-foreground mb-6">
            Practical advice to help you and your family feel confident and calm. 
            Being prepared doesn't mean living in fear — it means living with peace of mind.
          </p>
          <Link to="/tips">
            <Button variant="hero" size="lg">
              Explore All Tips
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="space-y-4">
          {tipPreviews.map((tip, index) => (
            <Link
              key={index}
              to="/tips"
              className="group flex items-start gap-4 p-4 rounded-xl bg-card border border-border/50 shadow-soft transition-all hover:shadow-soft-lg hover:-translate-y-0.5"
            >
              <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <tip.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                  {tip.title}
                </h3>
                <p className="text-sm text-muted-foreground">{tip.excerpt}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors mt-1" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TipsPreview;

import { Link } from "react-router-dom";
import { BookOpen, Lightbulb, Newspaper, ArrowRight } from "lucide-react";

const ResourcesSection = () => {
  const resources = [
    {
      icon: BookOpen,
      title: "Library",
      description: "Official guidance by country & language",
      href: "/library",
      color: "teal",
    },
    {
      icon: Lightbulb,
      title: "Tips",
      description: "Calm checklists and routines",
      href: "/tips",
      color: "emerald",
    },
    {
      icon: Newspaper,
      title: "Weekly Briefing",
      description: "Build your weekly situation overview",
      href: "/news/weekly",
      color: "amber",
    },
  ];

  return (
    <section className="py-16 md:py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            Learn & Stay Informed
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Practical resources to build your knowledge.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {resources.map((resource, index) => (
            <Link 
              key={index}
              to={resource.href}
              className="group bg-card rounded-2xl p-6 shadow-soft border border-border/50 card-hover text-left"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                resource.color === 'teal' ? 'bg-teal-muted text-teal' :
                resource.color === 'emerald' ? 'bg-emerald-light/20 text-emerald' :
                'bg-amber-100 text-amber-600'
              }`}>
                <resource.icon className="h-6 w-6" />
              </div>
              
              <h3 className="text-lg font-semibold text-foreground mb-1 group-hover:text-teal transition-colors">
                {resource.title}
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                {resource.description}
              </p>
              
              <span className={`inline-flex items-center gap-1 text-sm font-medium ${
                resource.color === 'teal' ? 'text-teal' :
                resource.color === 'emerald' ? 'text-emerald' :
                'text-amber-600'
              }`}>
                Explore
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ResourcesSection;

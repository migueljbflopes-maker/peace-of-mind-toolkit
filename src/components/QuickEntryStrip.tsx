import { Link } from "react-router-dom";
import { AlertTriangle, Package, Library, Newspaper, ArrowRight } from "lucide-react";

const QuickEntryStrip = () => {
  const entries = [
    {
      title: "Risk Calculator",
      description: "Assess your household's risk level",
      icon: AlertTriangle,
      href: "/tools/risk",
      color: "bg-amber-50 text-amber-600 group-hover:bg-amber-100",
    },
    {
      title: "Supplies Planner",
      description: "Plan your 14-day essentials",
      icon: Package,
      href: "/tools/supplies",
      color: "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100",
    },
    {
      title: "Library",
      description: "Official guidance & resources",
      icon: Library,
      href: "/library",
      color: "bg-sky-50 text-sky-600 group-hover:bg-sky-100",
    },
    {
      title: "Weekly Briefing",
      description: "Stay informed, stay calm",
      icon: Newspaper,
      href: "/news/weekly",
      color: "bg-violet-50 text-violet-600 group-hover:bg-violet-100",
    },
  ];

  return (
    <section className="container-wide section-padding py-8">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {entries.map((entry, index) => (
          <Link
            key={index}
            to={entry.href}
            className="group relative p-5 rounded-xl bg-background border border-border/50 shadow-soft transition-all duration-300 hover:shadow-soft-lg hover:-translate-y-1"
          >
            <div className="flex items-start gap-4">
              <div className={`p-2.5 rounded-xl transition-colors ${entry.color}`}>
                <entry.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                  {entry.title}
                </h3>
                <p className="text-sm text-muted-foreground">{entry.description}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default QuickEntryStrip;

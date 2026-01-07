import { Link } from "react-router-dom";
import { AlertTriangle, Package, Library, Newspaper, ArrowRight } from "lucide-react";

const QuickEntryStrip = () => {
  const entries = [
    {
      title: "Risk Calculator",
      description: "Assess your household's risk level",
      icon: AlertTriangle,
      href: "/tools/risk",
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
    },
    {
      title: "Supplies Planner",
      description: "Plan your 14-day essentials",
      icon: Package,
      href: "/tools/supplies",
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
    },
    {
      title: "Library",
      description: "Official guidance & resources",
      icon: Library,
      href: "/library",
      iconBg: "bg-sky-100",
      iconColor: "text-sky-600",
    },
    {
      title: "Weekly Briefing",
      description: "Stay informed, stay calm",
      icon: Newspaper,
      href: "/news/weekly",
      iconBg: "bg-violet-100",
      iconColor: "text-violet-600",
    },
  ];

  return (
    <section className="container-wide section-padding py-8">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {entries.map((entry, index) => (
          <Link
            key={index}
            to={entry.href}
            className="group relative p-5 rounded-xl bg-card border border-border/50 shadow-soft transition-all duration-300 hover:shadow-soft-lg hover:-translate-y-1"
          >
            <div className="flex items-start gap-4">
              <div className={`p-2.5 rounded-xl ${entry.iconBg} ${entry.iconColor} transition-colors`}>
                <entry.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground mb-1 group-hover:text-cta transition-colors">
                  {entry.title}
                </h3>
                <p className="text-sm text-muted-foreground">{entry.description}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-cta group-hover:translate-x-1 transition-all" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default QuickEntryStrip;
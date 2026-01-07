import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, Backpack, ArrowRight } from "lucide-react";
import iconBugIn from "@/assets/icon-bug-in.jpg";
import iconBugOut from "@/assets/icon-bug-out.jpg";

const BugInOutSection = () => {
  const options = [
    {
      id: "bug-in",
      icon: Home,
      image: iconBugIn,
      title: "Home Ready",
      subtitle: "Shelter in place with confidence",
      description: "14-day supplies, power backup, water storage",
      cta: "Plan supplies",
      href: "/tools/supplies",
      badgeColor: "bg-emerald-100 text-emerald-700",
      borderColor: "border-emerald-200 hover:border-emerald-300",
    },
    {
      id: "bug-out",
      icon: Backpack,
      image: iconBugOut,
      title: "Go-Bag Ready",
      subtitle: "Leave in 10 minutes",
      description: "Essential grab-and-go checklist",
      cta: "Go-bag checklist",
      href: "/tips",
      badgeColor: "bg-amber-100 text-amber-700",
      borderColor: "border-amber-200 hover:border-amber-300",
    },
  ];

  return (
    <section className="bg-section py-12 sm:py-16">
      <div className="container-wide section-padding">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            Two scenarios. One toolkit.
          </h2>
          <p className="text-muted-foreground">
            Whether you stay or go, be ready.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {options.map((option) => (
            <div
              key={option.id}
              className={`relative bg-card rounded-2xl border-2 ${option.borderColor} p-6 transition-all duration-300 hover:shadow-soft-lg`}
            >
              {/* Image */}
              <div className="mb-4 rounded-xl overflow-hidden">
                <img 
                  src={option.image} 
                  alt={option.title}
                  className="w-full h-32 sm:h-40 object-cover object-center"
                />
              </div>

              {/* Badge */}
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${option.badgeColor} mb-3`}>
                <option.icon className="h-3.5 w-3.5" />
                {option.id === "bug-in" ? "Stay Home" : "Leave Fast"}
              </div>

              {/* Content */}
              <h3 className="text-xl font-bold text-foreground mb-1">
                {option.title}
              </h3>
              <p className="text-sm text-muted-foreground mb-1">
                {option.subtitle}
              </p>
              <p className="text-xs text-muted-foreground/70 mb-4">
                {option.description}
              </p>

              {/* CTA */}
              <Link to={option.href}>
                <Button variant="cta" size="default" className="w-full gap-2">
                  {option.cta}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BugInOutSection;
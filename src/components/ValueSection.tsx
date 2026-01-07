import { Heart, Clock, Users, Shield } from "lucide-react";

const ValueSection = () => {
  const values = [
    {
      icon: Heart,
      title: "Peace of Mind",
      description: "Know you're prepared for what matters most, without stress or anxiety.",
      iconBg: "bg-rose-100",
      iconColor: "text-rose-600",
    },
    {
      icon: Clock,
      title: "Ready in Minutes",
      description: "Quick assessments and planning tools that fit into your busy life.",
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
    },
    {
      icon: Users,
      title: "Family-Focused",
      description: "Tools designed for households of all sizes, with personalized recommendations.",
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
    },
    {
      icon: Shield,
      title: "Trusted Guidance",
      description: "Based on official recommendations from civil protection authorities.",
      iconBg: "bg-sky-100",
      iconColor: "text-sky-600",
    },
  ];

  return (
    <section className="bg-section py-12 sm:py-16">
      <div className="container-wide section-padding">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            Preparedness is peace of mind.
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            A calm, methodical approach to being ready for life's uncertainties.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {values.map((value, index) => (
            <div
              key={index}
              className="group p-5 rounded-xl bg-card border border-border/50 shadow-soft transition-all duration-300 hover:shadow-soft-lg"
            >
              <div className={`inline-flex p-3 rounded-xl ${value.iconBg} ${value.iconColor} mb-4 transition-transform group-hover:scale-110`}>
                <value.icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-2">{value.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{value.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ValueSection;
import { Heart, Clock, Users, Shield } from "lucide-react";

const ValueSection = () => {
  const values = [
    {
      icon: Heart,
      title: "Peace of Mind",
      description: "Know you're prepared for what matters most, without stress or anxiety.",
    },
    {
      icon: Clock,
      title: "Ready in Minutes",
      description: "Quick assessments and planning tools that fit into your busy life.",
    },
    {
      icon: Users,
      title: "Family-Focused",
      description: "Tools designed for households of all sizes, with personalized recommendations.",
    },
    {
      icon: Shield,
      title: "Trusted Guidance",
      description: "Based on official recommendations from civil protection authorities.",
    },
  ];

  return (
    <section className="bg-section py-16 sm:py-20">
      <div className="container-wide section-padding">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Preparedness is peace of mind.
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            A calm, methodical approach to being ready for life's uncertainties.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {values.map((value, index) => (
            <div
              key={index}
              className="group p-6 rounded-xl bg-background border border-border/50 shadow-soft transition-all duration-300 hover:shadow-soft-lg"
            >
              <div className="inline-flex p-3 rounded-xl bg-primary/10 text-primary mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <value.icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{value.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{value.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ValueSection;

import { WifiOff, Printer, BookOpen } from "lucide-react";

const OfflineReassurance = () => {
  const features = [
    {
      icon: Printer,
      title: "Printable plan",
      description: "Generate a PDF you can keep offline",
    },
    {
      icon: WifiOff,
      title: "Offline access",
      description: "Works without internet connection",
    },
    {
      icon: BookOpen,
      title: "Official guidance",
      description: "Based on civil protection recommendations",
    },
  ];

  return (
    <section className="container-wide section-padding py-12">
      <div className="grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
        {features.map((feature, index) => (
          <div
            key={index}
            className="flex flex-col items-center text-center p-5 rounded-xl bg-card border border-border/50 shadow-soft"
          >
            <div className="p-3 rounded-xl bg-amber-50 text-amber-600 mb-3">
              <feature.icon className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">{feature.title}</h3>
            <p className="text-sm text-muted-foreground">{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default OfflineReassurance;
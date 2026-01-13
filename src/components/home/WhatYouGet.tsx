import { FileText, MapPin, FolderLock, MessageCircle } from "lucide-react";

const WhatYouGet = () => {
  const features = [
    {
      icon: FileText,
      title: "Personalized 72h Action Plan",
      description: "Step-by-step priorities based on your household and location.",
      color: "teal",
    },
    {
      icon: MapPin,
      title: "Risk Analysis for your area",
      description: "Understand the specific threats and preparedness gaps in your region.",
      color: "emerald",
    },
    {
      icon: FolderLock,
      title: "Emergency Vault & Red Folder",
      description: "Encrypted storage for documents. Printable PDF for offline access.",
      color: "amber",
      isPremium: true,
    },
    {
      icon: MessageCircle,
      title: "Guidance & Checklists",
      description: "Get calm guidance and practical checklists for any situation.",
      color: "teal",
    },
  ];

  return (
    <section className="py-16 md:py-20 bg-section">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            What you get
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Everything you need to prepare with confidence.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="relative bg-card rounded-2xl p-6 shadow-soft border border-border/50"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                feature.color === 'teal' ? 'bg-teal-muted text-teal' :
                feature.color === 'emerald' ? 'bg-emerald-light/20 text-emerald' :
                'bg-amber-100 text-amber-600'
              }`}>
                <feature.icon className="h-6 w-6" />
              </div>
              
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {feature.description}
              </p>
              
              {feature.isPremium && (
                <span className="absolute top-4 right-4 badge-premium">
                  Premium
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhatYouGet;

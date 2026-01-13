import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FileText, FolderLock, Map, CloudUpload, Clock, ArrowRight } from "lucide-react";

const PremiumTeaser = () => {
  const features = [
    { icon: FileText, label: "Red Folder (PDF export)" },
    { icon: FolderLock, label: "Vault (client-side encryption)" },
    { icon: Map, label: "Plans A & B" },
    { icon: CloudUpload, label: "Encrypted backup/restore" },
    { icon: Clock, label: "Legacy Locker", comingSoon: true },
  ];

  return (
    <section className="py-16 md:py-20 bg-section">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            Printable, offline documentation — when it matters.
          </h2>
          <p className="text-muted-foreground mb-8">
            One payment. Lifetime access. No subscription.
          </p>
          
          <div className="bg-card rounded-2xl p-6 md:p-8 shadow-soft border border-border/50 mb-8">
            <div className="grid sm:grid-cols-2 gap-4 text-left mb-8">
              {features.map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="h-5 w-5 text-amber-600" />
                  </div>
                  <span className="text-foreground font-medium">
                    {feature.label}
                    {feature.comingSoon && (
                      <span className="ml-2 badge-coming-soon">Coming Soon</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
            
            <Link to="/pricing">
              <Button variant="cta" size="lg" className="gap-2">
                Unlock Premium — €49
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
          
          <p className="text-sm text-muted-foreground">
            Free without login. Login only to save/export.
          </p>
        </div>
      </div>
    </section>
  );
};

export default PremiumTeaser;

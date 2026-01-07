import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { WifiOff, Shield, FileText } from "lucide-react";
import heroImage from "@/assets/hero-preparedness.jpg";
const Hero = () => {
  const trustBullets = [{
    icon: WifiOff,
    label: "Works offline"
  }, {
    icon: Shield,
    label: "No login needed"
  }, {
    icon: FileText,
    label: "Printable plans"
  }];
  return <section className="relative overflow-hidden bg-background">
      <div className="container-wide section-padding py-12 sm:py-16 lg:py-20">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left: Content */}
          <div className="space-y-6 lg:space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight text-balance animate-fade-in">
                Get ready in 15 minutes.
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground max-w-xl animate-fade-in [animation-delay:100ms] opacity-0">Não dependa da sorte.  Gere o seu plano de sobrevivência personalizado: o que estocar, o que levar e como agir.</p>
            </div>

            {/* Trust Bullets - Horizontal on mobile */}
            <div className="flex flex-wrap gap-4 animate-fade-in [animation-delay:150ms] opacity-0">
              {trustBullets.map((bullet, index) => <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="p-1.5 rounded-lg bg-amber-100">
                    <bullet.icon className="h-3.5 w-3.5 text-amber-600" />
                  </div>
                  <span className="font-medium">{bullet.label}</span>
                </div>)}
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3 animate-fade-in [animation-delay:200ms] opacity-0">
              <Link to="/start">
                <Button variant="cta" size="xl">
                  Start Free
                </Button>
              </Link>
              <Link to="/library">
                <Button variant="hero-outline" size="xl">
                  Explore Library
                </Button>
              </Link>
            </div>
          </div>

          {/* Right: Hero Image */}
          <div className="relative animate-fade-in [animation-delay:300ms] opacity-0">
            <div className="relative rounded-2xl overflow-hidden shadow-soft-xl">
              <img src={heroImage} alt="Emergency preparedness kit with go-bag, water, first aid, and supplies near front door" className="w-full h-auto object-cover aspect-[16/10]" />
              {/* Subtle overlay for depth */}
              <div className="absolute inset-0 bg-gradient-to-t from-navy/10 to-transparent" />
            </div>
            
            {/* Floating badge */}
            <div className="absolute -bottom-4 left-4 right-4 sm:left-8 sm:right-auto">
              <div className="inline-flex items-center gap-2 bg-background border border-border rounded-xl px-4 py-2.5 shadow-soft-lg">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-medium text-foreground">Ready when you need it</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>;
};
export default Hero;
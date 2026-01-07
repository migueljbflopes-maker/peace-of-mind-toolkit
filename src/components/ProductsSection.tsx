import { Button } from "@/components/ui/button";
import { ExternalLink, Flashlight, Radio, Droplet, Cross, Battery, Compass } from "lucide-react";

const ProductsSection = () => {
  const products = [
    {
      icon: Flashlight,
      name: "Emergency Flashlight",
      description: "Hand-crank LED with USB charging",
      category: "Light & Power",
    },
    {
      icon: Radio,
      name: "Weather Radio",
      description: "AM/FM/NOAA with solar panel",
      category: "Communication",
    },
    {
      icon: Droplet,
      name: "Water Filter",
      description: "Portable filtration system",
      category: "Water",
    },
    {
      icon: Cross,
      name: "First Aid Kit",
      description: "Comprehensive 150-piece kit",
      category: "Medical",
    },
    {
      icon: Battery,
      name: "Power Station",
      description: "Portable battery backup",
      category: "Power",
    },
    {
      icon: Compass,
      name: "Navigation Kit",
      description: "Compass, maps, and whistle",
      category: "Navigation",
    },
  ];

  return (
    <section id="products" className="bg-section py-16 sm:py-20">
      <div className="container-wide section-padding">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Curated preparedness products
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Quality items we recommend for your emergency kit. All products are independently selected.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto mb-10">
          {products.map((product, index) => (
            <div
              key={index}
              className="group p-5 rounded-xl bg-background border border-border/50 shadow-soft transition-all hover:shadow-soft-lg"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <product.icon className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-xs font-medium text-primary mb-1 block">
                    {product.category}
                  </span>
                  <h3 className="font-semibold text-foreground mb-1">{product.name}</h3>
                  <p className="text-sm text-muted-foreground">{product.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Button variant="hero-outline" size="lg" asChild>
            <a href="#products">
              Browse Products
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ProductsSection;

import { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import {
  Droplets,
  Zap,
  Flashlight,
  Radio,
  Heart,
  Sparkles,
  Flame,
  Thermometer,
  Wrench,
  FileText,
  Car,
  Baby,
  Search,
  ChevronDown,
  ExternalLink,
  AlertCircle,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Types
type Market = "NL" | "DE" | "UK" | "US";
type Importance = "Must-have" | "Good-to-have";

interface Product {
  id: string;
  category: string;
  name: string;
  importance: Importance;
  priority: 1 | 2 | 3 | 4 | 5;
  why: string;
  hardware: boolean;
  asinByMarket: { nl?: string; de?: string; uk?: string; us?: string };
  searchQuery: string;
}

// Market configuration
const MARKET_STORAGE_KEY = "resilient_amazon_market";

const tldByMarket: Record<Market, string> = {
  NL: "amazon.nl",
  DE: "amazon.de",
  UK: "amazon.co.uk",
  US: "amazon.com",
};

// Affiliate tags - replace with your actual tags
const tagsByMarket: Record<Market, string> = {
  NL: "YOURTAG",
  DE: "YOURTAG",
  UK: "YOURTAG",
  US: "YOURTAG",
};

const marketLabels: Record<Market, string> = {
  NL: "🇳🇱 Netherlands",
  DE: "🇩🇪 Germany",
  UK: "🇬🇧 United Kingdom",
  US: "🇺🇸 United States",
};

// Category icons
const categoryIcons: Record<string, typeof Droplets> = {
  "Water & Purification": Droplets,
  "Power & Charging": Zap,
  "Lighting": Flashlight,
  "Communication": Radio,
  "First Aid & Medical": Heart,
  "Hygiene & Sanitation": Sparkles,
  "Cooking & Utilities": Flame,
  "Warmth & Shelter": Thermometer,
  "Tools & Repair": Wrench,
  "Documents & Cash": FileText,
  "Mobility": Car,
  "Pets & Baby": Baby,
};

// Product catalog
const productCatalog: Product[] = [
  // Water & Purification
  {
    id: "water-container-10l",
    category: "Water & Purification",
    name: "Collapsible Water Container (10L)",
    importance: "Must-have",
    priority: 5,
    why: "Stores water safely and folds flat when not in use.",
    hardware: true,
    asinByMarket: { de: "B08CXQN9GY", nl: "B08CXQN9GY", uk: "B00UY1QUXG", us: "B001QFYQ7W" },
    searchQuery: "collapsible water container 10L",
  },
  {
    id: "water-filter-portable",
    category: "Water & Purification",
    name: "Portable Water Filter",
    importance: "Must-have",
    priority: 5,
    why: "Makes questionable water safe to drink in emergencies.",
    hardware: true,
    asinByMarket: { de: "B00FA2RLX2", nl: "B00FA2RLX2", uk: "B00FA2RLX2", us: "B00FA2RLX2" },
    searchQuery: "portable water filter emergency",
  },
  {
    id: "water-purification-tablets",
    category: "Water & Purification",
    name: "Water Purification Tablets",
    importance: "Good-to-have",
    priority: 4,
    why: "Lightweight backup for water safety.",
    hardware: false,
    asinByMarket: { de: "B003IMQKFC", uk: "B003IMQKFC", us: "B0014LL9PS" },
    searchQuery: "water purification tablets",
  },
  // Power & Charging
  {
    id: "power-bank-20000",
    category: "Power & Charging",
    name: "Power Bank (20,000mAh)",
    importance: "Must-have",
    priority: 5,
    why: "Keeps phones charged for days without electricity.",
    hardware: true,
    asinByMarket: { de: "B09KGYGZJ7", nl: "B09KGYGZJ7", uk: "B09KGYGZJ7", us: "B08LH26PFT" },
    searchQuery: "power bank 20000mah",
  },
  {
    id: "solar-charger",
    category: "Power & Charging",
    name: "Solar Charger Panel",
    importance: "Good-to-have",
    priority: 4,
    why: "Renewable power source when grid is down.",
    hardware: true,
    asinByMarket: { de: "B07PPLFSQV", uk: "B07PPLFSQV", us: "B07CMJK3PC" },
    searchQuery: "solar charger panel portable",
  },
  {
    id: "battery-charger",
    category: "Power & Charging",
    name: "Battery Charger + Spare Batteries",
    importance: "Must-have",
    priority: 5,
    why: "Keeps flashlights and radios running.",
    hardware: true,
    asinByMarket: { de: "B07D2KL7W5", uk: "B07D2KL7W5", us: "B00TOVTZ7K" },
    searchQuery: "rechargeable battery charger AA AAA",
  },
  // Lighting
  {
    id: "headlamp-led",
    category: "Lighting",
    name: "LED Headlamp (Rechargeable)",
    importance: "Must-have",
    priority: 5,
    why: "Hands-free lighting for any situation.",
    hardware: true,
    asinByMarket: { de: "B07R2H6VX7", uk: "B07R2H6VX7", us: "B075SVSQSM" },
    searchQuery: "LED headlamp rechargeable",
  },
  {
    id: "lantern-camping",
    category: "Lighting",
    name: "Camping Lantern",
    importance: "Good-to-have",
    priority: 4,
    why: "Lights up entire rooms safely.",
    hardware: true,
    asinByMarket: { de: "B07S4QZ4VK", uk: "B07S4QZ4VK", us: "B018KYWFRK" },
    searchQuery: "camping lantern LED",
  },
  {
    id: "flashlight-tactical",
    category: "Lighting",
    name: "Tactical Flashlight",
    importance: "Good-to-have",
    priority: 3,
    why: "Bright and durable for outdoor use.",
    hardware: true,
    asinByMarket: { de: "B0795MZ7VQ", uk: "B0795MZ7VQ", us: "B07KFDS8ZP" },
    searchQuery: "tactical flashlight LED",
  },
  // Communication
  {
    id: "emergency-radio",
    category: "Communication",
    name: "Emergency Crank Radio (AM/FM)",
    importance: "Must-have",
    priority: 5,
    why: "Get updates when internet and power fail.",
    hardware: true,
    asinByMarket: { de: "B07WQKF5PZ", uk: "B08SHGMCMS", us: "B0BW4SRMXJ" },
    searchQuery: "emergency crank radio AM FM",
  },
  {
    id: "whistle-emergency",
    category: "Communication",
    name: "Emergency Whistle (Set of 2)",
    importance: "Good-to-have",
    priority: 3,
    why: "Signal for help over long distances.",
    hardware: true,
    asinByMarket: { de: "B08PQMCJ7B", uk: "B08PQMCJ7B", us: "B0797MB5BQ" },
    searchQuery: "emergency whistle loud",
  },
  // First Aid & Medical
  {
    id: "first-aid-kit-complete",
    category: "First Aid & Medical",
    name: "Complete First Aid Kit",
    importance: "Must-have",
    priority: 5,
    why: "Essential for treating injuries when help is delayed.",
    hardware: true,
    asinByMarket: { de: "B08Z7GQMJ3", uk: "B008DKPFH2", us: "B000069EYA" },
    searchQuery: "first aid kit complete",
  },
  {
    id: "thermometer-digital",
    category: "First Aid & Medical",
    name: "Digital Thermometer",
    importance: "Good-to-have",
    priority: 3,
    why: "Monitor health without visiting a doctor.",
    hardware: true,
    asinByMarket: { de: "B07PRY8W6L", uk: "B07PRY8W6L", us: "B07PVD5KY2" },
    searchQuery: "digital thermometer medical",
  },
  // Hygiene & Sanitation
  {
    id: "toilet-bags",
    category: "Hygiene & Sanitation",
    name: "Emergency Toilet Bags",
    importance: "Good-to-have",
    priority: 4,
    why: "Sanitary solution when plumbing fails.",
    hardware: false,
    asinByMarket: { de: "B07WVFGK5F", uk: "B07WVFGK5F", us: "B001BY8IB8" },
    searchQuery: "emergency toilet bags portable",
  },
  {
    id: "hand-sanitizer-large",
    category: "Hygiene & Sanitation",
    name: "Hand Sanitizer (Large Bottle)",
    importance: "Good-to-have",
    priority: 3,
    why: "Hygiene when water is limited.",
    hardware: false,
    asinByMarket: {},
    searchQuery: "hand sanitizer 500ml",
  },
  // Cooking & Utilities
  {
    id: "camping-stove-portable",
    category: "Cooking & Utilities",
    name: "Portable Camping Stove",
    importance: "Must-have",
    priority: 5,
    why: "Cook hot meals when power is out.",
    hardware: true,
    asinByMarket: { de: "B07CWYQZFJ", uk: "B07CWYQZFJ", us: "B00BS4RP7S" },
    searchQuery: "portable camping stove butane",
  },
  {
    id: "fuel-canisters",
    category: "Cooking & Utilities",
    name: "Fuel Canisters (Pack of 4)",
    importance: "Good-to-have",
    priority: 4,
    why: "Keep your stove running for weeks.",
    hardware: true,
    asinByMarket: { de: "B07HFVJ9M9", uk: "B00AM1KS9U", us: "B00LI4VKQI" },
    searchQuery: "butane fuel canisters camping",
  },
  {
    id: "can-opener-manual",
    category: "Cooking & Utilities",
    name: "Manual Can Opener",
    importance: "Must-have",
    priority: 4,
    why: "Open canned food without electricity.",
    hardware: true,
    asinByMarket: { de: "B000IOVEK2", uk: "B000IOVEK2", us: "B000IOVEK2" },
    searchQuery: "manual can opener durable",
  },
  // Warmth & Shelter
  {
    id: "emergency-blankets",
    category: "Warmth & Shelter",
    name: "Emergency Mylar Blankets (Pack of 10)",
    importance: "Must-have",
    priority: 5,
    why: "Retain body heat in cold emergencies.",
    hardware: true,
    asinByMarket: { de: "B07RK4NGYS", uk: "B07RK4NGYS", us: "B07GLCYR5S" },
    searchQuery: "emergency mylar blankets",
  },
  {
    id: "sleeping-bag-compact",
    category: "Warmth & Shelter",
    name: "Compact Sleeping Bag",
    importance: "Good-to-have",
    priority: 3,
    why: "Stay warm if you need to leave home.",
    hardware: true,
    asinByMarket: { de: "B09MWNXPNY", uk: "B09MWNXPNY", us: "B07D7P5TBN" },
    searchQuery: "compact sleeping bag emergency",
  },
  // Tools & Repair
  {
    id: "multi-tool",
    category: "Tools & Repair",
    name: "Multi-Tool (Quality Brand)",
    importance: "Must-have",
    priority: 5,
    why: "Dozens of uses in one pocket-sized tool.",
    hardware: true,
    asinByMarket: { de: "B005DI0XM4", uk: "B005DI0XM4", us: "B000KBU8VO" },
    searchQuery: "leatherman multi-tool",
  },
  {
    id: "duct-tape",
    category: "Tools & Repair",
    name: "Heavy-Duty Duct Tape",
    importance: "Good-to-have",
    priority: 4,
    why: "Fixes almost anything temporarily.",
    hardware: true,
    asinByMarket: { de: "B01LX6O00V", uk: "B07B6H8J1K", us: "B00006XXXX" },
    searchQuery: "heavy duty duct tape",
  },
  {
    id: "work-gloves",
    category: "Tools & Repair",
    name: "Work Gloves (Heavy Duty)",
    importance: "Good-to-have",
    priority: 3,
    why: "Protect hands during repairs or cleanup.",
    hardware: true,
    asinByMarket: { de: "B07KSJ9QRZ", uk: "B07KSJ9QRZ", us: "B000JCJG0G" },
    searchQuery: "heavy duty work gloves",
  },
  // Documents & Cash
  {
    id: "document-pouch",
    category: "Documents & Cash",
    name: "Waterproof Document Pouch",
    importance: "Must-have",
    priority: 5,
    why: "Keep important papers safe from water damage.",
    hardware: true,
    asinByMarket: { de: "B07FRZGXQB", uk: "B07FRZGXQB", us: "B07D7PM9K7" },
    searchQuery: "waterproof document bag",
  },
  {
    id: "cash-organizer",
    category: "Documents & Cash",
    name: "Cash Envelope Organizer",
    importance: "Good-to-have",
    priority: 3,
    why: "Keep emergency cash organized and accessible.",
    hardware: false,
    asinByMarket: {},
    searchQuery: "cash envelope organizer",
  },
  // Mobility
  {
    id: "backpack-emergency",
    category: "Mobility",
    name: "Emergency Backpack (Durable)",
    importance: "Good-to-have",
    priority: 4,
    why: "Carry essentials if you need to leave quickly.",
    hardware: true,
    asinByMarket: { de: "B07PGTGJ6X", uk: "B07PGTGJ6X", us: "B07V4M5KPS" },
    searchQuery: "emergency backpack durable",
  },
  // Pets & Baby
  {
    id: "pet-carrier",
    category: "Pets & Baby",
    name: "Pet Carrier (Collapsible)",
    importance: "Good-to-have",
    priority: 4,
    why: "Transport pets safely during evacuation.",
    hardware: true,
    asinByMarket: { de: "B07B4WBVF6", uk: "B07B4WBVF6", us: "B014XV89K4" },
    searchQuery: "pet carrier collapsible",
  },
];

// Categories
const categories = [
  "Water & Purification",
  "Power & Charging",
  "Lighting",
  "Communication",
  "First Aid & Medical",
  "Hygiene & Sanitation",
  "Cooking & Utilities",
  "Warmth & Shelter",
  "Tools & Repair",
  "Documents & Cash",
  "Mobility",
  "Pets & Baby",
];

// Helper: detect default market from browser
const getDefaultMarket = (): Market => {
  const lang = navigator.language?.toLowerCase() || "en";
  if (lang.startsWith("nl")) return "NL";
  if (lang.startsWith("de")) return "DE";
  if (lang === "en-gb") return "UK";
  return "US";
};

// Helper: build Amazon URL
const buildAmazonUrl = (
  product: Product,
  market: Market
): { url: string; isFallback: boolean } => {
  const tld = tldByMarket[market];
  const tag = tagsByMarket[market];
  const marketKey = market.toLowerCase() as keyof typeof product.asinByMarket;
  const asin = product.asinByMarket[marketKey];

  if (asin) {
    return {
      url: `https://www.${tld}/dp/${asin}?tag=${tag}`,
      isFallback: false,
    };
  }

  const encodedQuery = encodeURIComponent(product.searchQuery);
  return {
    url: `https://www.${tld}/s?k=${encodedQuery}&tag=${tag}`,
    isFallback: true,
  };
};

const AmazonProductsSection = () => {
  const location = useLocation();
  
  // Market state
  const [selectedMarket, setSelectedMarket] = useState<Market>(() => {
    const saved = localStorage.getItem(MARKET_STORAGE_KEY);
    if (saved && ["NL", "DE", "UK", "US"].includes(saved)) {
      return saved as Market;
    }
    return getDefaultMarket();
  });

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [mustHavesOnly, setMustHavesOnly] = useState(false);
  const [sortByPriority, setSortByPriority] = useState(true);

  // Parse URL query param for search
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get("q");
    if (q) {
      setSearchQuery(decodeURIComponent(q));
      // Scroll to products section
      setTimeout(() => {
        document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [location.search]);

  // Save market preference
  useEffect(() => {
    localStorage.setItem(MARKET_STORAGE_KEY, selectedMarket);
  }, [selectedMarket]);

  // Filtered and sorted products
  const filteredProducts = useMemo(() => {
    let products = [...productCatalog];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      products = products.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query) ||
          p.searchQuery.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (selectedCategory !== "all") {
      products = products.filter((p) => p.category === selectedCategory);
    }

    // Must-haves filter
    if (mustHavesOnly) {
      products = products.filter((p) => p.importance === "Must-have");
    }

    // Sort by priority
    if (sortByPriority) {
      products.sort((a, b) => b.priority - a.priority);
    }

    return products;
  }, [searchQuery, selectedCategory, mustHavesOnly, sortByPriority]);

  // Top priority items (harder to get last-minute)
  const topPriorityItems = useMemo(() => {
    return productCatalog
      .filter((p) => p.priority >= 4)
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 8);
  }, []);

  const ProductCard = ({ product }: { product: Product }) => {
    const { url, isFallback } = buildAmazonUrl(product, selectedMarket);
    const IconComponent = categoryIcons[product.category] || AlertCircle;

    return (
      <div className="bg-card rounded-xl border border-border p-4 hover:shadow-md transition-all">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <IconComponent className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="text-sm font-semibold text-foreground line-clamp-2">
                {product.name}
              </h3>
              <Badge
                variant={product.importance === "Must-have" ? "default" : "secondary"}
                className="shrink-0 text-[10px]"
              >
                {product.importance}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <div
                    key={n}
                    className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      n <= product.priority ? "bg-primary" : "bg-border"
                    )}
                  />
                ))}
              </div>
              <span className="text-[10px] text-muted-foreground">
                Priority {product.priority}/5
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
              {product.why}
            </p>
            <a
              href={url}
              target="_blank"
              rel="nofollow sponsored noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {isFallback ? "Find on Amazon (may vary)" : "View on Amazon"}
            </a>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section id="products" className="bg-section-light py-10">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2">
            Recommended products (practical, no hype)
          </h2>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            These support your plan and are easier to arrange ahead of time.
          </p>
        </div>

        {/* Market Selector */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-2 bg-card rounded-lg border border-border p-1">
            {(["NL", "DE", "UK", "US"] as Market[]).map((market) => (
              <button
                key={market}
                onClick={() => setSelectedMarket(market)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                  selectedMarket === market
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {market === "NL" && "🇳🇱"}
                {market === "DE" && "🇩🇪"}
                {market === "UK" && "🇬🇧"}
                {market === "US" && "🇺🇸"}
                <span className="ml-1">{market}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Hard to get last-minute */}
        <div className="bg-card rounded-xl border border-border p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">
              Harder to get last-minute
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            These items are easier to arrange ahead of time. Consider prioritizing them.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {topPriorityItems.map((product) => {
              const { url, isFallback } = buildAmazonUrl(product, selectedMarket);
              return (
                <a
                  key={product.id}
                  href={url}
                  target="_blank"
                  rel="nofollow sponsored noopener noreferrer"
                  className="flex items-center gap-2 bg-background rounded-lg border border-border p-2.5 hover:border-primary/50 transition-all group"
                >
                  <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="text-xs font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                    {product.name.length > 25 ? product.name.slice(0, 25) + "..." : product.name}
                  </span>
                </a>
              );
            })}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-xl border border-border p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>

            {/* Category */}
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-48 h-9 text-sm">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Must-haves toggle */}
            <div className="flex items-center gap-2 bg-background rounded-lg border border-border px-3 py-1.5">
              <Switch
                id="must-haves"
                checked={mustHavesOnly}
                onCheckedChange={setMustHavesOnly}
                className="scale-75"
              />
              <Label htmlFor="must-haves" className="text-xs font-medium cursor-pointer">
                Must-haves only
              </Label>
            </div>

            {/* Sort toggle */}
            <div className="flex items-center gap-2 bg-background rounded-lg border border-border px-3 py-1.5">
              <Switch
                id="sort-priority"
                checked={sortByPriority}
                onCheckedChange={setSortByPriority}
                className="scale-75"
              />
              <Label htmlFor="sort-priority" className="text-xs font-medium cursor-pointer">
                Highest priority
              </Label>
            </div>
          </div>
        </div>

        {/* Results count */}
        <p className="text-xs text-muted-foreground mb-4">
          Showing {filteredProducts.length} product{filteredProducts.length !== 1 ? "s" : ""}
        </p>

        {/* Product Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">
              No products found. Try adjusting your filters.
            </p>
          </div>
        )}

        {/* Disclosure */}
        <div className="bg-muted/30 rounded-lg p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">
            Some links are affiliate links. If you buy through them, we may earn a small commission at no extra cost to you.
          </p>
          <p className="text-[10px] text-muted-foreground/70">
            Availability and pricing can change on Amazon.
          </p>
        </div>
      </div>
    </section>
  );
};

export default AmazonProductsSection;

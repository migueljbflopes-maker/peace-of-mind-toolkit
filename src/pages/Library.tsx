import { useState, useMemo } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { LoginModal } from "@/components/modals/LoginModal";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Search,
  ExternalLink,
  Bookmark,
  FileText,
  Globe,
  Filter,
  Star,
  Building2,
  WifiOff,
} from "lucide-react";

// Seed data for the library
const libraryDocs = [
  // Netherlands
  { id: "nl-1", title: "NL Alert – Emergency Alerts System", publisher: "Rijksoverheid", country: "NL", language: "NL", type: "Web", topics: ["Alerts", "Communication"], url: "https://www.nl-alert.nl/", featured: true },
  { id: "nl-2", title: "Crisis Preparation Guide", publisher: "Rijksoverheid", country: "NL", language: "NL", type: "Web", topics: ["General Preparedness"], url: "https://www.rijksoverheid.nl/onderwerpen/crisis-en-rampen", featured: true },
  { id: "nl-3", title: "Red Cross Emergency Checklist", publisher: "Rode Kruis", country: "NL", language: "NL", type: "PDF", topics: ["Supplies", "Checklist"], url: "https://www.rodekruis.nl/hulp-in-nederland/ehbo-cursus/ehbo-in-noodsituaties/", featured: false },
  
  // Germany
  { id: "de-1", title: "BBK Ratgeber für Notfallvorsorge", publisher: "Bundesamt für Bevölkerungsschutz", country: "DE", language: "DE", type: "PDF", topics: ["General Preparedness", "Supplies"], url: "https://www.bbk.bund.de/DE/Warnung-Vorsorge/Vorsorge/vorsorge_node.html", featured: true },
  { id: "de-2", title: "NINA Warning App", publisher: "BBK", country: "DE", language: "DE", type: "Web", topics: ["Alerts", "Communication"], url: "https://www.bbk.bund.de/DE/Warnung-Vorsorge/Warn-App-NINA/warn-app-nina_node.html", featured: true },
  { id: "de-3", title: "Checkliste für den Notfall", publisher: "Bundesamt für Bevölkerungsschutz", country: "DE", language: "DE", type: "PDF", topics: ["Checklist", "Supplies"], url: "https://www.bbk.bund.de/SharedDocs/Downloads/DE/Mediathek/Publikationen/Buergerinformationen/Ratgeber/ratgeber-notfallvorsorge.html", featured: false },
  { id: "de-4", title: "Stromausfall Vorsorge", publisher: "BBK", country: "DE", language: "DE", type: "PDF", topics: ["Power Outage", "General Preparedness"], url: "https://www.bbk.bund.de/DE/Warnung-Vorsorge/Vorsorge/Stromausfall/stromausfall_node.html", featured: false },
  
  // UK
  { id: "uk-1", title: "Preparing for Emergencies Guide", publisher: "UK Government", country: "UK", language: "EN", type: "PDF", topics: ["General Preparedness"], url: "https://www.gov.uk/government/publications/preparing-for-emergencies", featured: true },
  { id: "uk-2", title: "National Risk Register", publisher: "Cabinet Office", country: "UK", language: "EN", type: "PDF", topics: ["Risk Assessment"], url: "https://www.gov.uk/government/publications/national-risk-register-2023", featured: false },
  { id: "uk-3", title: "Flood Preparation Guide", publisher: "Environment Agency", country: "UK", language: "EN", type: "Web", topics: ["Flooding", "General Preparedness"], url: "https://www.gov.uk/prepare-for-flooding", featured: false },
  { id: "uk-4", title: "Emergency Alerts UK", publisher: "UK Government", country: "UK", language: "EN", type: "Web", topics: ["Alerts", "Communication"], url: "https://www.gov.uk/alerts", featured: true },
  
  // USA
  { id: "us-1", title: "Ready.gov Emergency Preparedness", publisher: "FEMA", country: "US", language: "EN", type: "Web", topics: ["General Preparedness"], url: "https://www.ready.gov/", featured: true },
  { id: "us-2", title: "Build A Kit Guide", publisher: "FEMA", country: "US", language: "EN", type: "PDF", topics: ["Supplies", "Checklist"], url: "https://www.ready.gov/kit", featured: true },
  { id: "us-3", title: "Make A Plan Guide", publisher: "FEMA", country: "US", language: "EN", type: "Web", topics: ["Planning", "Family"], url: "https://www.ready.gov/plan", featured: false },
  { id: "us-4", title: "Wireless Emergency Alerts", publisher: "FCC", country: "US", language: "EN", type: "Web", topics: ["Alerts", "Communication"], url: "https://www.fcc.gov/consumers/guides/wireless-emergency-alerts-wea", featured: false },
  { id: "us-5", title: "FEMA App", publisher: "FEMA", country: "US", language: "EN", type: "Web", topics: ["Alerts", "General Preparedness"], url: "https://www.fema.gov/about/news-multimedia/mobile-app-text-messages", featured: false },
  
  // Portugal
  { id: "pt-1", title: "ANEPC Proteção Civil", publisher: "Autoridade Nacional de Emergência", country: "PT", language: "PT", type: "Web", topics: ["General Preparedness"], url: "https://www.prociv.gov.pt/", featured: true },
  { id: "pt-2", title: "Guia de Preparação para Emergências", publisher: "ANEPC", country: "PT", language: "PT", type: "PDF", topics: ["General Preparedness", "Checklist"], url: "https://www.prociv.gov.pt/pt/cidadao/saiba-o-que-fazer/", featured: false },
  { id: "pt-3", title: "Incêndios Rurais - Prevenção", publisher: "ANEPC", country: "PT", language: "PT", type: "Web", topics: ["Fire", "Prevention"], url: "https://www.prociv.gov.pt/pt/cidadao/incendios-rurais/", featured: false },
  
  // EU / International
  { id: "eu-1", title: "EU Civil Protection Mechanism", publisher: "European Commission", country: "EU", language: "EN", type: "Web", topics: ["General Preparedness", "International"], url: "https://civil-protection-humanitarian-aid.ec.europa.eu/what/civil-protection_en", featured: true },
  { id: "eu-2", title: "European Flood Awareness System", publisher: "Copernicus", country: "EU", language: "EN", type: "Web", topics: ["Flooding", "Alerts"], url: "https://www.efas.eu/", featured: false },
  
  // Global / Cross-border
  { id: "gl-1", title: "IFRC Disaster Preparedness", publisher: "International Red Cross", country: "Global", language: "EN", type: "Web", topics: ["General Preparedness"], url: "https://www.ifrc.org/our-work/disasters-climate-and-crises/disaster-preparedness", featured: true },
  { id: "gl-2", title: "WHO Health Emergencies", publisher: "World Health Organization", country: "Global", language: "EN", type: "Web", topics: ["Health", "Pandemics"], url: "https://www.who.int/emergencies", featured: false },
  { id: "gl-3", title: "UNDRR Sendai Framework", publisher: "United Nations", country: "Global", language: "EN", type: "PDF", topics: ["Risk Assessment", "International"], url: "https://www.undrr.org/implementing-sendai-framework/what-sendai-framework", featured: false },
  { id: "gl-4", title: "72 Hours Emergency Kit", publisher: "Canadian Red Cross", country: "Global", language: "EN", type: "PDF", topics: ["Supplies", "Checklist"], url: "https://www.redcross.ca/how-we-help/emergencies-and-disasters-in-canada/be-ready-emergency-preparedness-and-recovery/get-an-emergency-kit", featured: false },
  { id: "gl-5", title: "First Aid Basics", publisher: "IFRC", country: "Global", language: "EN", type: "Web", topics: ["First Aid", "Health"], url: "https://www.ifrc.org/first-aid", featured: false },
  { id: "gl-6", title: "Climate Adaptation Guide", publisher: "IPCC", country: "Global", language: "EN", type: "PDF", topics: ["Climate", "Long-term Planning"], url: "https://www.ipcc.ch/report/ar6/wg2/", featured: false },
];

const countries = ["NL", "DE", "UK", "US", "PT", "EU", "Global"];
const languages = ["EN", "NL", "DE", "PT"];
const allTopics = [...new Set(libraryDocs.flatMap(d => d.topics))].sort();
const types = ["PDF", "Web"];

const Library = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [officialOnly, setOfficialOnly] = useState(true);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Listen for online/offline status
  useState(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  });

  const toggleFilter = (
    value: string,
    selected: string[],
    setSelected: (v: string[]) => void
  ) => {
    if (selected.includes(value)) {
      setSelected(selected.filter((v) => v !== value));
    } else {
      setSelected([...selected, value]);
    }
  };

  const filteredDocs = useMemo(() => {
    return libraryDocs.filter((doc) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          doc.title.toLowerCase().includes(query) ||
          doc.publisher.toLowerCase().includes(query) ||
          doc.topics.some((t) => t.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }

      // Country filter
      if (selectedCountries.length > 0 && !selectedCountries.includes(doc.country)) {
        return false;
      }

      // Language filter
      if (selectedLanguages.length > 0 && !selectedLanguages.includes(doc.language)) {
        return false;
      }

      // Topics filter
      if (selectedTopics.length > 0 && !doc.topics.some((t) => selectedTopics.includes(t))) {
        return false;
      }

      // Type filter
      if (selectedTypes.length > 0 && !selectedTypes.includes(doc.type)) {
        return false;
      }

      return true;
    });
  }, [searchQuery, selectedCountries, selectedLanguages, selectedTopics, selectedTypes]);

  const featuredDocs = useMemo(() => {
    let featured = filteredDocs.filter((d) => d.featured);
    // If a country is selected, prioritize that country
    if (selectedCountries.length === 1) {
      const country = selectedCountries[0];
      featured = featured.sort((a, b) => {
        if (a.country === country && b.country !== country) return -1;
        if (b.country === country && a.country !== country) return 1;
        return 0;
      });
    }
    return featured.slice(0, 6);
  }, [filteredDocs, selectedCountries]);

  const handleBookmark = () => {
    // Soft gate - require login
    setLoginModalOpen(true);
  };

  const clearFilters = () => {
    setSelectedCountries([]);
    setSelectedLanguages([]);
    setSelectedTopics([]);
    setSelectedTypes([]);
    setSearchQuery("");
  };

  const hasActiveFilters =
    selectedCountries.length > 0 ||
    selectedLanguages.length > 0 ||
    selectedTopics.length > 0 ||
    selectedTypes.length > 0;

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Country Quick Select */}
      <div>
        <Label className="text-sm font-medium text-foreground mb-3 block">
          Country / Region
        </Label>
        <div className="flex flex-wrap gap-2">
          {countries.map((country) => (
            <button
              key={country}
              onClick={() => toggleFilter(country, selectedCountries, setSelectedCountries)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedCountries.includes(country)
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground"
              }`}
            >
              {country}
            </button>
          ))}
        </div>
      </div>

      {/* Language */}
      <div>
        <Label className="text-sm font-medium text-foreground mb-3 block">
          Language
        </Label>
        <div className="space-y-2">
          {languages.map((lang) => (
            <div key={lang} className="flex items-center gap-2">
              <Checkbox
                id={`lang-${lang}`}
                checked={selectedLanguages.includes(lang)}
                onCheckedChange={() =>
                  toggleFilter(lang, selectedLanguages, setSelectedLanguages)
                }
              />
              <label
                htmlFor={`lang-${lang}`}
                className="text-sm text-muted-foreground cursor-pointer"
              >
                {lang === "EN" ? "English" : lang === "NL" ? "Dutch" : lang === "DE" ? "German" : "Portuguese"}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Topics */}
      <div>
        <Label className="text-sm font-medium text-foreground mb-3 block">
          Topics
        </Label>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {allTopics.map((topic) => (
            <div key={topic} className="flex items-center gap-2">
              <Checkbox
                id={`topic-${topic}`}
                checked={selectedTopics.includes(topic)}
                onCheckedChange={() =>
                  toggleFilter(topic, selectedTopics, setSelectedTopics)
                }
              />
              <label
                htmlFor={`topic-${topic}`}
                className="text-sm text-muted-foreground cursor-pointer"
              >
                {topic}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Type */}
      <div>
        <Label className="text-sm font-medium text-foreground mb-3 block">
          Type
        </Label>
        <div className="space-y-2">
          {types.map((type) => (
            <div key={type} className="flex items-center gap-2">
              <Checkbox
                id={`type-${type}`}
                checked={selectedTypes.includes(type)}
                onCheckedChange={() =>
                  toggleFilter(type, selectedTypes, setSelectedTypes)
                }
              />
              <label
                htmlFor={`type-${type}`}
                className="text-sm text-muted-foreground cursor-pointer flex items-center gap-2"
              >
                {type === "PDF" ? <FileText className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
                {type}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Official Only Toggle */}
      <div className="flex items-center justify-between">
        <Label htmlFor="official-only" className="text-sm text-muted-foreground">
          Official sources only
        </Label>
        <Switch
          id="official-only"
          checked={officialOnly}
          onCheckedChange={setOfficialOnly}
        />
      </div>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="w-full">
          Clear all filters
        </Button>
      )}
    </div>
  );

  const DocumentCard = ({ doc }: { doc: typeof libraryDocs[0] }) => (
    <div className="bg-background rounded-xl border border-border p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            {doc.type === "PDF" ? (
              <FileText className="h-4 w-4 text-red-500 flex-shrink-0" />
            ) : (
              <Globe className="h-4 w-4 text-primary flex-shrink-0" />
            )}
            <h3 className="font-semibold text-foreground truncate">{doc.title}</h3>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <Building2 className="h-3.5 w-3.5" />
            <span>{doc.publisher}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Badge variant="secondary" className="text-xs">
              {doc.country}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {doc.language}
            </Badge>
            {doc.topics.slice(0, 2).map((topic) => (
              <Badge key={topic} variant="outline" className="text-xs bg-primary/5 border-primary/20 text-primary">
                {topic}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          className="flex-1"
          onClick={() => {
            if (!isOnline) {
              return;
            }
            window.open(doc.url, "_blank", "noopener,noreferrer");
          }}
          disabled={!isOnline}
        >
          <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
          Open
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleBookmark}
        >
          <Bookmark className="h-3.5 w-3.5" />
        </Button>
      </div>

      {!isOnline && (
        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
          <WifiOff className="h-3 w-3" />
          Internet required to open
        </p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Header */}
      <section className="py-12 bg-slate-50">
        <div className="container-wide section-padding">
          <div className="max-w-2xl">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
              Institutional Library
            </h1>
            <p className="text-lg text-muted-foreground">
              Official emergency preparedness guidance from trusted government and international sources.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-8">
        <div className="container-wide section-padding">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar - Desktop */}
            <aside className="hidden lg:block w-64 flex-shrink-0">
              <div className="sticky top-24 bg-slate-50 rounded-xl p-5">
                <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filters
                </h2>
                <FilterContent />
              </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1">
              {/* Search + Mobile Filter */}
              <div className="flex items-center gap-3 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search documents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Mobile Filter Button */}
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="icon" className="lg:hidden">
                      <Filter className="h-4 w-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-80">
                    <SheetHeader>
                      <SheetTitle>Filters</SheetTitle>
                    </SheetHeader>
                    <div className="mt-6">
                      <FilterContent />
                    </div>
                  </SheetContent>
                </Sheet>
              </div>

              {/* Offline Notice */}
              {!isOnline && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center gap-3">
                  <WifiOff className="h-5 w-5 text-amber-600" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">You're offline</p>
                    <p className="text-xs text-amber-600">Document list is available, but opening links requires internet.</p>
                  </div>
                </div>
              )}

              {/* Start Here Section */}
              {featuredDocs.length > 0 && (
                <div className="mb-10">
                  <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Star className="h-5 w-5 text-primary" />
                    Start here
                  </h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    {featuredDocs.map((doc) => (
                      <DocumentCard key={doc.id} doc={doc} />
                    ))}
                  </div>
                </div>
              )}

              {/* All Documents */}
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-4">
                  All documents
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    ({filteredDocs.length} {filteredDocs.length === 1 ? "result" : "results"})
                  </span>
                </h2>

                {filteredDocs.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-xl">
                    <p className="text-muted-foreground">No documents match your filters.</p>
                    <Button variant="link" onClick={clearFilters} className="mt-2">
                      Clear filters
                    </Button>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {filteredDocs.map((doc) => (
                      <DocumentCard key={doc.id} doc={doc} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />

      <LoginModal open={loginModalOpen} onOpenChange={setLoginModalOpen} />
    </div>
  );
};

export default Library;

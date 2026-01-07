import { useState, useMemo, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { LoginModal } from "@/components/modals/LoginModal";
import { useToast } from "@/hooks/use-toast";
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
  Copy,
} from "lucide-react";
import { libraryDocs, countries, languages, allTopics, types, type LibraryDocument } from "@/data/librarySeed";

const Library = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [officialOnly, setOfficialOnly] = useState(true);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Listen for online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

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

  const handleOpenLink = (url: string) => {
    if (!isOnline) {
      toast({
        title: "You're offline",
        description: "Links open on the web; requires internet.",
        variant: "destructive",
      });
      return;
    }

    try {
      const newWindow = window.open(url, "_blank", "noopener,noreferrer");
      if (!newWindow) {
        toast({
          title: "Link blocked",
          description: "Your browser blocked this link. Use Copy link or allowlist this site.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Link blocked",
        description: "Your browser blocked this link. Use Copy link or allowlist this site.",
        variant: "destructive",
      });
    }
  };

  const handleCopyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Link copied",
        description: "The link has been copied to your clipboard.",
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Could not copy link. Please try again.",
        variant: "destructive",
      });
    }
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

  const DocumentCard = ({ doc }: { doc: LibraryDocument }) => (
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
          onClick={() => handleOpenLink(doc.url)}
          disabled={!isOnline}
        >
          <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
          Open
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleCopyLink(doc.url)}
          title="Copy link"
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleBookmark}
          title="Bookmark"
        >
          <Bookmark className="h-3.5 w-3.5" />
        </Button>
      </div>

      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
        <Globe className="h-3 w-3" />
        Links open on the web; requires internet.
      </p>
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

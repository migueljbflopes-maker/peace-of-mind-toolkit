import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LoginModal } from "@/components/modals/LoginModal";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Clock,
  Bookmark,
  CheckCircle2,
  ArrowRight,
  AlertTriangle,
  Package,
  BookOpen,
  Newspaper,
  WifiOff,
  Sparkles,
  X,
} from "lucide-react";
import { tipsContent, allTopics, allAudiences, type TipContent } from "@/data/tipsSeed";
import { Link } from "react-router-dom";

const BOOKMARKS_KEY = "resilient_tip_bookmarks";
const PROGRESS_KEY = "resilient_tip_progress";

const Tips = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedAudiences, setSelectedAudiences] = useState<string[]>([]);
  const [offlineOnly, setOfflineOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"recommended" | "newest">("recommended");
  
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [returnUrl, setReturnUrl] = useState<string | null>(null);
  
  const [selectedTip, setSelectedTip] = useState<TipContent | null>(null);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [completedTips, setCompletedTips] = useState<string[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Load bookmarks and progress from localStorage
  useEffect(() => {
    const savedBookmarks = localStorage.getItem(BOOKMARKS_KEY);
    const savedProgress = localStorage.getItem(PROGRESS_KEY);
    if (savedBookmarks) setBookmarks(JSON.parse(savedBookmarks));
    if (savedProgress) setCompletedTips(JSON.parse(savedProgress));
  }, []);

  // Handle URL params for opening specific tip
  useEffect(() => {
    const tipSlug = searchParams.get("tip");
    if (tipSlug) {
      const tip = tipsContent.find(t => t.slug === tipSlug);
      if (tip) setSelectedTip(tip);
    }
  }, [searchParams]);

  // Online/offline listener
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

  const toggleTopic = (topic: string) => {
    setSelectedTopics(prev =>
      prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
    );
  };

  const toggleAudience = (audience: string) => {
    setSelectedAudiences(prev =>
      prev.includes(audience) ? prev.filter(a => a !== audience) : [...prev, audience]
    );
  };

  const filteredTips = useMemo(() => {
    return tipsContent.filter(tip => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!tip.title.toLowerCase().includes(query) &&
            !tip.summary.toLowerCase().includes(query) &&
            !tip.topics.some(t => t.toLowerCase().includes(query))) {
          return false;
        }
      }
      if (selectedTopics.length > 0 && !tip.topics.some(t => selectedTopics.includes(t))) {
        return false;
      }
      if (selectedAudiences.length > 0 && !tip.audience.some(a => selectedAudiences.includes(a))) {
        return false;
      }
      if (offlineOnly && !tip.offlineReady) {
        return false;
      }
      return true;
    });
  }, [searchQuery, selectedTopics, selectedAudiences, offlineOnly]);

  const handleBookmark = (tip: TipContent) => {
    // For MVP, we'll use localStorage but show login modal
    // In production, this would check auth state
    const isLoggedIn = false; // Replace with actual auth check
    
    if (!isLoggedIn) {
      setReturnUrl(`/tips?tip=${tip.slug}`);
      setLoginModalOpen(true);
      return;
    }
    
    toggleBookmark(tip.slug);
  };

  const toggleBookmark = (slug: string) => {
    const newBookmarks = bookmarks.includes(slug)
      ? bookmarks.filter(b => b !== slug)
      : [...bookmarks, slug];
    setBookmarks(newBookmarks);
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(newBookmarks));
    toast({
      title: bookmarks.includes(slug) ? "Bookmark removed" : "Bookmarked",
      description: bookmarks.includes(slug) 
        ? "Removed from your saved tips." 
        : "Saved to your bookmarks.",
    });
  };

  const toggleComplete = (slug: string) => {
    const newCompleted = completedTips.includes(slug)
      ? completedTips.filter(c => c !== slug)
      : [...completedTips, slug];
    setCompletedTips(newCompleted);
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(newCompleted));
    toast({
      title: completedTips.includes(slug) ? "Marked as unread" : "Marked as done",
    });
  };

  const openTip = (tip: TipContent) => {
    setSelectedTip(tip);
    setSearchParams({ tip: tip.slug });
  };

  const closeTip = () => {
    setSelectedTip(null);
    setSearchParams({});
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedTopics([]);
    setSelectedAudiences([]);
    setOfflineOnly(false);
  };

  const startHereCards = [
    { title: "2-minute risk check", description: "Understand your situation", href: "/tools/risk", icon: AlertTriangle },
    { title: "14-day essentials plan", description: "Build your supplies list", href: "/tools/supplies", icon: Package },
    { title: "Official guidance library", description: "Trusted government sources", href: "/library", icon: BookOpen },
    { title: "Weekly briefing", description: "Stay informed, calmly", href: "/news/weekly", icon: Newspaper },
  ];

  const TipCard = ({ tip }: { tip: TipContent }) => (
    <div className="bg-background rounded-xl border border-border p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-semibold text-foreground line-clamp-2">{tip.title}</h3>
        {completedTips.includes(tip.slug) && (
          <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
        )}
      </div>
      
      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{tip.summary}</p>
      
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Badge variant="secondary" className="text-xs flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {tip.minutes} min
        </Badge>
        {tip.topics.slice(0, 2).map(topic => (
          <Badge key={topic} variant="outline" className="text-xs">
            {topic}
          </Badge>
        ))}
        {tip.offlineReady && (
          <Badge variant="outline" className="text-xs bg-green-50 border-green-200 text-green-700">
            Offline
          </Badge>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        <Button size="sm" className="flex-1" onClick={() => openTip(tip)}>
          Open
          <ArrowRight className="h-3.5 w-3.5 ml-1" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleBookmark(tip)}
          className={bookmarks.includes(tip.slug) ? "text-primary" : ""}
        >
          <Bookmark className={`h-3.5 w-3.5 ${bookmarks.includes(tip.slug) ? "fill-current" : ""}`} />
        </Button>
      </div>
    </div>
  );

  const renderMarkdown = (content: string) => {
    // Simple markdown renderer
    const lines = content.split('\n');
    const elements: JSX.Element[] = [];
    let listItems: string[] = [];
    let checklistItems: string[] = [];
    
    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`list-${elements.length}`} className="list-disc list-inside space-y-1 mb-4 text-muted-foreground">
            {listItems.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        );
        listItems = [];
      }
    };
    
    const flushChecklist = () => {
      if (checklistItems.length > 0) {
        elements.push(
          <div key={`checklist-${elements.length}`} className="bg-slate-50 rounded-lg p-4 mb-4 space-y-2">
            {checklistItems.map((item, i) => (
              <label key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                <input type="checkbox" className="rounded border-border" />
                {item}
              </label>
            ))}
          </div>
        );
        checklistItems = [];
      }
    };
    
    lines.forEach((line, i) => {
      if (line.startsWith('## ')) {
        flushList();
        flushChecklist();
        elements.push(
          <h2 key={i} className="text-lg font-semibold text-foreground mt-6 mb-3">
            {line.replace('## ', '')}
          </h2>
        );
      } else if (line.startsWith('### ')) {
        flushList();
        flushChecklist();
        elements.push(
          <h3 key={i} className="text-base font-medium text-foreground mt-4 mb-2">
            {line.replace('### ', '')}
          </h3>
        );
      } else if (line.startsWith('- [ ] ')) {
        flushList();
        checklistItems.push(line.replace('- [ ] ', ''));
      } else if (line.startsWith('- ')) {
        flushChecklist();
        listItems.push(line.replace('- ', ''));
      } else if (line.startsWith('**') && line.endsWith('**')) {
        flushList();
        flushChecklist();
        elements.push(
          <p key={i} className="font-medium text-foreground mt-4 mb-2">
            {line.replace(/\*\*/g, '')}
          </p>
        );
      } else if (line.trim()) {
        flushList();
        flushChecklist();
        // Handle inline bold
        const parts = line.split(/(\*\*.*?\*\*)/);
        elements.push(
          <p key={i} className="text-muted-foreground mb-3">
            {parts.map((part, j) => 
              part.startsWith('**') && part.endsWith('**') 
                ? <strong key={j} className="font-medium text-foreground">{part.replace(/\*\*/g, '')}</strong>
                : part
            )}
          </p>
        );
      }
    });
    
    flushList();
    flushChecklist();
    
    return elements;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Header */}
      <section className="py-12 bg-slate-50">
        <div className="container-wide section-padding">
          <div className="max-w-2xl">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
              Tips & Peace of Mind
            </h1>
            <p className="text-lg text-muted-foreground">
              Small steps that make you feel ready — without overthinking.
            </p>
          </div>
        </div>
      </section>

      {/* Start Here */}
      <section id="start" className="py-10">
        <div className="container-wide section-padding">
          <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Start here
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {startHereCards.map((card) => (
              <Link
                key={card.href}
                to={card.href}
                className="bg-background rounded-xl border border-border p-5 hover:shadow-md hover:border-primary/30 transition-all group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-colors">
                    <card.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground">{card.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{card.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Content Library */}
      <section id="guides" className="py-10 bg-slate-50">
        <div className="container-wide section-padding">
          <h2 className="text-xl font-semibold text-foreground mb-6">
            Guides & checklists
          </h2>

          {/* Search + Filters */}
          <div className="space-y-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search tips..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background"
              />
            </div>

            {/* Filter chips */}
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground py-1">Topics:</span>
              {allTopics.slice(0, 8).map(topic => (
                <button
                  key={topic}
                  onClick={() => toggleTopic(topic)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    selectedTopics.includes(topic)
                      ? "bg-primary text-primary-foreground"
                      : "bg-background border border-border hover:border-primary/50"
                  }`}
                >
                  {topic}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground py-1">Household:</span>
              {allAudiences.map(audience => (
                <button
                  key={audience}
                  onClick={() => toggleAudience(audience)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    selectedAudiences.includes(audience)
                      ? "bg-primary text-primary-foreground"
                      : "bg-background border border-border hover:border-primary/50"
                  }`}
                >
                  {audience}
                </button>
              ))}
              <button
                onClick={() => setOfflineOnly(!offlineOnly)}
                className={`px-3 py-1 rounded-full text-sm transition-colors flex items-center gap-1 ${
                  offlineOnly
                    ? "bg-primary text-primary-foreground"
                    : "bg-background border border-border hover:border-primary/50"
                }`}
              >
                <WifiOff className="h-3 w-3" />
                Offline-ready
              </button>
            </div>

            {(selectedTopics.length > 0 || selectedAudiences.length > 0 || offlineOnly || searchQuery) && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </div>

          {/* Results */}
          <div className="mb-4 text-sm text-muted-foreground">
            {filteredTips.length} {filteredTips.length === 1 ? "guide" : "guides"}
          </div>

          {filteredTips.length === 0 ? (
            <div className="text-center py-12 bg-background rounded-xl">
              <p className="text-muted-foreground">No guides match your filters.</p>
              <Button variant="link" onClick={clearFilters} className="mt-2">
                Clear filters
              </Button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTips.map(tip => (
                <TipCard key={tip.slug} tip={tip} />
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />

      {/* Reading Modal */}
      <Dialog open={!!selectedTip} onOpenChange={(open) => !open && closeTip()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedTip && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <DialogTitle className="text-xl mb-2">{selectedTip.title}</DialogTitle>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="text-xs flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {selectedTip.minutes} min read
                      </Badge>
                      {selectedTip.topics.map(topic => (
                        <Badge key={topic} variant="outline" className="text-xs">
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="mt-4">
                {renderMarkdown(selectedTip.contentMarkdown)}
              </div>

              {/* Actions */}
              <div className="mt-6 pt-4 border-t border-border space-y-4">
                {/* Progress toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Mark as completed</span>
                  <Button
                    variant={completedTips.includes(selectedTip.slug) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleComplete(selectedTip.slug)}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    {completedTips.includes(selectedTip.slug) ? "Done" : "Mark done"}
                  </Button>
                </div>

                {/* Bookmark */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Save for later</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBookmark(selectedTip)}
                    className={bookmarks.includes(selectedTip.slug) ? "text-primary" : ""}
                  >
                    <Bookmark className={`h-4 w-4 mr-1 ${bookmarks.includes(selectedTip.slug) ? "fill-current" : ""}`} />
                    Bookmark
                  </Button>
                </div>

                {/* Next steps */}
                <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                  <p className="text-sm font-medium text-foreground">Next steps</p>
                  <div className="flex flex-wrap gap-2">
                    <Link to="/tools/risk">
                      <Button variant="outline" size="sm">
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        Risk check
                      </Button>
                    </Link>
                    <Link to="/tools/supplies">
                      <Button variant="outline" size="sm">
                        <Package className="h-4 w-4 mr-1" />
                        Supplies planner
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Premium teaser */}
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                  <p className="text-sm font-medium text-foreground mb-1">
                    Want this in a printable offline plan?
                  </p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Get your Personalized Resiliency Plan with the Red Folder format.
                  </p>
                  <Link to="/pricing">
                    <Button size="sm" variant="default">
                      Unlock Premium (49€)
                      <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <LoginModal 
        open={loginModalOpen} 
        onOpenChange={setLoginModalOpen} 
      />
    </div>
  );
};

export default Tips;

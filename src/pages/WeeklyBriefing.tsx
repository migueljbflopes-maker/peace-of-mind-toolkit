import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoginModal } from "@/components/modals/LoginModal";
import { AlertPreferencesForm } from "@/components/alerts/AlertPreferencesForm";
import { AlertsInbox } from "@/components/alerts/AlertsInbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLocale } from "@/i18n/useLocale";
import { useAuth } from "@/hooks/useAuth";
import { useEntitlements } from "@/hooks/useEntitlements";
import { useAlertPreferences } from "@/hooks/useAlertPreferences";
import { useAlertsInbox } from "@/hooks/useAlertsInbox";
import {
  Globe,
  AlertTriangle,
  RefreshCw,
  Copy,
  Bookmark,
  ExternalLink,
  Lock,
  Bell,
  Shield,
  FileText,
  Database,
  Zap,
  Clock,
  Info,
  CheckCircle2,
  WifiOff,
} from "lucide-react";

// Types
type NewsKind = "signals" | "context" | "headline";

interface NewsItem {
  id: string;
  source_id: string;
  kind: NewsKind;
  published_at: string | null;
  fetched_at: string;
  title: string;
  summary: string | null;
  url: string | null;
  domain: string | null;
  region: string | null;
  topics: string[];
  severity: "major" | "moderate";
  language: string;
}

interface BriefingFilters {
  region: string;
  topics: string[];
  timeRange: number;
  majorOnly: boolean;
  kind: NewsKind | "all";
}

const REGIONS = [
  "Global",
  "Europe",
  "North America",
  "Middle East",
  "Asia",
  "Africa",
  "South America",
  "Oceania",
];

const TOPICS = [
  "Conflict & Geopolitics",
  "Natural Hazards",
  "Public Health",
  "Cyber & Outages",
  "Supply & Infrastructure",
  "Travel Disruptions",
];

const CALM_STEPS = [
  "Review your emergency contacts list and ensure numbers are up to date.",
  "Check your supplies: water, flashlight batteries, first-aid kit basics.",
  "Share this briefing with a family member so everyone stays informed.",
];

export default function WeeklyBriefing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { t } = useLocale();
  const { user, isAuthenticated } = useAuth();
  const { isPremium, loading: loadingEntitlements } = useEntitlements();
  const { preferences, isLoading: loadingPrefs, isSaving, savePreferences, markAsSeen } = useAlertPreferences();
  const { alerts, isLoading: loadingAlerts, newCount, refresh: refreshAlerts } = useAlertsInbox(preferences);
  
  // State
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'briefing');
  
  // Filters
  const [filters, setFilters] = useState<BriefingFilters>({
    region: "Global",
    topics: [],
    timeRange: 7,
    majorOnly: true,
    kind: "headline",
  });

  // Track online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load cached briefing from localStorage
  useEffect(() => {
    const cached = localStorage.getItem("resilient_weekly_briefing_last");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.items && parsed.items.length > 0 && parsed.timestamp) {
          const cacheAge = Date.now() - parsed.timestamp;
          if (cacheAge < 600000) {
            setNewsItems(parsed.items);
            setLastUpdated(new Date(parsed.lastUpdated));
            setLoading(false);
            return;
          }
        }
      } catch {
        localStorage.removeItem("resilient_weekly_briefing_last");
      }
    }
    fetchNewsItems();
  }, []);

  // Fetch news items
  const fetchNewsItems = async () => {
    setLoading(true);
    try {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - filters.timeRange);

      let query = supabase
        .from("news_items")
        .select("*")
        .gte("published_at", daysAgo.toISOString())
        .order("published_at", { ascending: false })
        .limit(50);

      if (filters.majorOnly && filters.kind !== "headline") {
        query = query.or("severity.eq.major,kind.eq.headline");
      }

      if (filters.region !== "Global") {
        query = query.ilike("region", `%${filters.region}%`);
      }

      if (filters.topics.length > 0) {
        query = query.overlaps("topics", filters.topics);
      }

      if (filters.kind !== "all") {
        query = query.eq("kind", filters.kind);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data && data.length > 0) {
        const maxFetched = data.reduce((max, item) => {
          const fetched = new Date(item.fetched_at);
          return fetched > max ? fetched : max;
        }, new Date(0));
        setLastUpdated(maxFetched);
      }

      setNewsItems((data as NewsItem[]) || []);

      localStorage.setItem(
        "resilient_weekly_briefing_last",
        JSON.stringify({
          items: data,
          timestamp: Date.now(),
          lastUpdated: new Date().toISOString(),
        })
      );
    } catch (error) {
      console.error("Error fetching news:", error);
      toast({
        title: "Unable to load briefing",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNewsItems();
  }, [filters.region, filters.topics.length, filters.timeRange, filters.majorOnly, filters.kind]);

  const handleGenerateBriefing = async () => {
    setGenerating(true);
    await fetchNewsItems();
    setGenerating(false);
    toast({
      title: "Briefing generated",
      description: `Showing ${filters.majorOnly ? "major" : "all"} signals from the past ${filters.timeRange} days.`,
    });
  };

  const handleCopySummary = () => {
    const summary = newsItems
      .slice(0, 5)
      .map((item, i) => `${i + 1}. ${item.title}`)
      .join("\n");
    
    const fullText = `Weekly Briefing - ${new Date().toLocaleDateString()}\n\nTop Signals:\n${summary}\n\nWhat to do:\n${CALM_STEPS.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\nGenerated by Resilient.app`;
    
    navigator.clipboard.writeText(fullText);
    toast({ title: "Summary copied to clipboard" });
  };

  const handleSaveBriefing = () => {
    if (!user) {
      setLoginModalOpen(true);
      return;
    }
    toast({ title: "Briefing saved", description: "Access it anytime from your dashboard." });
  };

  const handleOpenLink = (url: string) => {
    try {
      const win = window.open(url, "_blank", "noopener,noreferrer");
      if (!win) {
        toast({
          title: "Your browser blocked this link",
          description: "Use Copy link or allowlist this site.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Unable to open link",
        description: "Please try copying the link instead.",
        variant: "destructive",
      });
    }
  };

  const toggleTopic = (topic: string) => {
    setFilters((prev) => ({
      ...prev,
      topics: prev.topics.includes(topic)
        ? prev.topics.filter((t) => t !== topic)
        : [...prev.topics, topic],
    }));
  };

  const topSignals = newsItems.slice(0, 5);
  const isStale = lastUpdated && Date.now() - lastUpdated.getTime() > 3600000;

  // Render Alerts Tab Content
  const renderAlertsContent = () => {
    // Not logged in
    if (!isAuthenticated) {
      return (
        <Card className="max-w-lg mx-auto">
          <CardHeader className="text-center">
            <div className="mx-auto p-3 rounded-full bg-primary/10 w-fit mb-2">
              <Bell className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>{t.alerts.notLoggedIn.title}</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">{t.alerts.notLoggedIn.body}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => navigate('/login?return_url=/news/weekly')}>
                {t.alerts.notLoggedIn.login}
              </Button>
              <Button variant="outline" onClick={() => navigate('/pricing')}>
                {t.alerts.notLoggedIn.viewPremium}
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    // Logged in but not premium
    if (!isPremium) {
      return (
        <div className="space-y-6 max-w-2xl mx-auto">
          {/* Premium Bundle Card */}
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-white to-sky-50">
            <CardHeader className="text-center">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mx-auto mb-2">
                <Zap className="h-4 w-4" />
                Premium
              </div>
              <CardTitle className="text-xl">{t.premium.title}</CardTitle>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="text-2xl font-bold text-primary">{t.premium.price}</span>
                <span className="text-muted-foreground">one-time</span>
              </div>
              <p className="text-sm text-muted-foreground">{t.premium.priceNote}</p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                {Object.values(t.premium.features).map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button className="w-full" onClick={() => navigate('/pricing')}>
                {t.premium.unlockCta}
              </Button>
            </CardContent>
          </Card>
          
          {/* Free note */}
          <p className="text-sm text-muted-foreground text-center">
            {t.alerts.notPremium.note}
          </p>
        </div>
      );
    }

    // Premium user - show preferences and inbox
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        {/* Offline banner */}
        {!isOnline && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3">
            <WifiOff className="h-5 w-5 text-amber-600" />
            <span className="text-sm text-amber-800">{t.alerts.offlineBanner}</span>
          </div>
        )}

        {/* Preferences */}
        <AlertPreferencesForm
          preferences={preferences}
          isSaving={isSaving}
          onSave={savePreferences}
        />

        {/* Inbox */}
        {preferences.enabled && (
          <AlertsInbox
            alerts={alerts}
            isLoading={loadingAlerts}
            newCount={newCount}
            onMarkAsSeen={markAsSeen}
            onRefresh={refreshAlerts}
          />
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-1">
        {/* Header */}
        <section className="bg-gradient-to-b from-sky-50 to-background py-12 md:py-16">
          <div className="container max-w-4xl mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-4">
              <Globe className="h-4 w-4" />
              Weekly Briefing
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
              Stay Informed, Stay Calm
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              A curated summary of global developments — filtered, neutral, and actionable.
            </p>
            <p className="text-xs text-muted-foreground mt-4 flex items-center justify-center gap-1">
              <Info className="h-3 w-3" />
              Informational only. Always follow local authorities.
            </p>
          </div>
        </section>

        {/* Tabs */}
        <section className="py-8 bg-white border-b">
          <div className="container max-w-4xl mx-auto px-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
                <TabsTrigger value="briefing" className="gap-2">
                  <Globe className="h-4 w-4" />
                  {t.alerts.tabBriefing}
                </TabsTrigger>
                <TabsTrigger value="alerts" className="gap-2">
                  <Bell className="h-4 w-4" />
                  {t.alerts.tabAlerts}
                  {isPremium && newCount > 0 && (
                    <Badge variant="destructive" className="ml-1 text-xs px-1.5">
                      {newCount}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* Briefing Tab Content */}
              <TabsContent value="briefing" className="mt-8">
                {/* Filters */}
                <div className="space-y-4 mb-8">
                  {/* Region */}
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      Region Focus
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {REGIONS.map((region) => (
                        <Button
                          key={region}
                          variant={filters.region === region ? "default" : "outline"}
                          size="sm"
                          onClick={() => setFilters((prev) => ({ ...prev, region }))}
                          className="rounded-full"
                        >
                          {region}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Topics */}
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      Topics
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {TOPICS.map((topic) => (
                        <Button
                          key={topic}
                          variant={filters.topics.includes(topic) ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleTopic(topic)}
                          className="rounded-full"
                        >
                          {topic}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Kind filter */}
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      Source Type
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: "all", label: "All" },
                        { value: "signals", label: "Signals" },
                        { value: "context", label: "Context" },
                        { value: "headline", label: "Headlines" },
                      ].map((item) => (
                        <Button
                          key={item.value}
                          variant={filters.kind === item.value ? "default" : "outline"}
                          size="sm"
                          onClick={() => setFilters((prev) => ({ ...prev, kind: item.value as NewsKind | "all" }))}
                          className="rounded-full"
                        >
                          {item.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Time & Major toggle */}
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium">Time Range:</label>
                      <select
                        value={filters.timeRange}
                        onChange={(e) =>
                          setFilters((prev) => ({ ...prev, timeRange: Number(e.target.value) }))
                        }
                        className="border rounded-lg px-3 py-1.5 text-sm bg-background"
                      >
                        <option value={7}>7 days</option>
                        <option value={30}>30 days</option>
                      </select>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.majorOnly}
                        onChange={(e) =>
                          setFilters((prev) => ({ ...prev, majorOnly: e.target.checked }))
                        }
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm font-medium">Major only</span>
                    </label>
                  </div>

                  {/* Generate button */}
                  <Button
                    onClick={handleGenerateBriefing}
                    disabled={generating}
                    className="w-full sm:w-auto"
                  >
                    {generating ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Generate this week's briefing
                      </>
                    )}
                  </Button>

                  {lastUpdated && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Last updated: {lastUpdated.toLocaleString()}
                      {isStale && (
                        <span className="text-amber-600 ml-2">
                          (Updates may be delayed)
                        </span>
                      )}
                    </p>
                  )}
                </div>

                {/* Briefing Content */}
                <div className="bg-slate-50 rounded-xl p-6">
                  {loading ? (
                    <div className="text-center py-12">
                      <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                      <p className="text-muted-foreground">Loading briefing...</p>
                    </div>
                  ) : newsItems.length === 0 ? (
                    <div className="text-center py-12">
                      <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">All quiet</h3>
                      <p className="text-muted-foreground">
                        No major signals matching your filters in the past {filters.timeRange} days.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {/* Top Signals */}
                      <div>
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-primary" />
                          Top Signals ({topSignals.length})
                        </h2>
                        <div className="space-y-3">
                          {topSignals.map((item) => (
                            <Card key={item.id} className="hover:shadow-md transition-shadow">
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                      <Badge
                                        variant={item.severity === "major" ? "destructive" : "secondary"}
                                        className="text-xs"
                                      >
                                        {item.severity}
                                      </Badge>
                                      <Badge variant="outline" className="text-xs capitalize">
                                        {item.kind}
                                      </Badge>
                                      {item.topics.slice(0, 2).map((topic) => (
                                        <Badge key={topic} variant="outline" className="text-xs">
                                          {topic}
                                        </Badge>
                                      ))}
                                    </div>
                                    <h3 className="font-medium text-foreground line-clamp-2">
                                      {item.title}
                                    </h3>
                                    {item.summary && (
                                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                        {item.summary}
                                      </p>
                                    )}
                                    <p className="text-xs text-muted-foreground mt-2">
                                      {item.published_at
                                        ? new Date(item.published_at).toLocaleDateString()
                                        : "Date unknown"}{" "}
                                      • {item.region || "Global"}
                                      {item.domain && <span className="ml-1">• {item.domain}</span>}
                                    </p>
                                  </div>
                                  {item.url && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleOpenLink(item.url!)}
                                      className="shrink-0"
                                    >
                                      <ExternalLink className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>

                      {/* What to do */}
                      <Card className="bg-primary/5 border-primary/20">
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Shield className="h-5 w-5 text-primary" />
                            What to do this week
                          </CardTitle>
                          <CardDescription>
                            Three calm steps to stay prepared
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-3">
                            {CALM_STEPS.map((step, i) => (
                              <li key={i} className="flex items-start gap-3">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white text-sm flex items-center justify-center">
                                  {i + 1}
                                </span>
                                <span className="text-foreground">{step}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-3">
                        <Button variant="outline" onClick={handleCopySummary}>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy summary
                        </Button>
                        <Button variant="outline" onClick={handleSaveBriefing}>
                          <Bookmark className="h-4 w-4 mr-2" />
                          Save briefing
                        </Button>
                      </div>

                      {/* Sources */}
                      <div className="text-xs text-muted-foreground">
                        <p className="font-medium mb-1">Sources:</p>
                        <p>
                          USGS, GDACS, ReliefWeb, MeteoAlarm, ECDC •{" "}
                          <a href="https://www.gdacs.org" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            GDACS
                          </a>
                          {" • "}
                          <a href="https://earthquake.usgs.gov" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            USGS
                          </a>
                          {" • "}
                          <a href="https://reliefweb.int" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            ReliefWeb
                          </a>
                        </p>
                        <p className="mt-2 flex items-center gap-1">
                          <Info className="h-3 w-3" />
                          Links open on the web; requires internet.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Alerts Tab Content */}
              <TabsContent value="alerts" className="mt-8">
                {loadingEntitlements ? (
                  <div className="text-center py-12">
                    <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">{t.common.loading}</p>
                  </div>
                ) : (
                  renderAlertsContent()
                )}
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </main>

      <Footer />
      
      <LoginModal open={loginModalOpen} onOpenChange={setLoginModalOpen} />
    </div>
  );
}

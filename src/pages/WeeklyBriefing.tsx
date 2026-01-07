import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginModal } from "@/components/modals/LoginModal";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
  const { toast } = useToast();
  
  // State
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isPremium, setIsPremium] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState<BriefingFilters>({
    region: "Global",
    topics: [],
    timeRange: 7,
    majorOnly: false,
    kind: "all",
  });

  // Load cached briefing from localStorage - but always fetch fresh data after
  useEffect(() => {
    const cached = localStorage.getItem("resilient_weekly_briefing_last");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.items && parsed.items.length > 0 && parsed.timestamp) {
          const cacheAge = Date.now() - parsed.timestamp;
          // Use cache only if less than 10 minutes old
          if (cacheAge < 600000) {
            setNewsItems(parsed.items);
            setLastUpdated(new Date(parsed.lastUpdated));
            setLoading(false);
            return; // Skip fetch only if valid recent cache
          }
        }
      } catch (e) {
        localStorage.removeItem("resilient_weekly_briefing_last");
      }
    }
    // Always fetch if no valid cache
    fetchNewsItems();
  }, []);

  // Check auth state
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      // For MVP, isPremium would come from entitlements
      // Stub: check localStorage or a future entitlements table
      setIsPremium(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
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

      if (filters.majorOnly) {
        query = query.eq("severity", "major");
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

      // Get max fetched_at for "last updated"
      if (data && data.length > 0) {
        const maxFetched = data.reduce((max, item) => {
          const fetched = new Date(item.fetched_at);
          return fetched > max ? fetched : max;
        }, new Date(0));
        setLastUpdated(maxFetched);
      }

      setNewsItems((data as NewsItem[]) || []);

      // Cache to localStorage
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

  // Re-fetch when filters change
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
    // Save logic would go here
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

        {/* Filters */}
        <section className="py-8 border-b bg-white">
          <div className="container max-w-4xl mx-auto px-4">
            <div className="space-y-4">
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

              {/* Last updated */}
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
          </div>
        </section>

        {/* Briefing Content */}
        <section className="py-10 bg-slate-50">
          <div className="container max-w-4xl mx-auto px-4">
            {loading ? (
              <div className="text-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Loading briefing...</p>
              </div>
            ) : newsItems.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">All quiet</h3>
                  <p className="text-muted-foreground">
                    No major signals matching your filters in the past {filters.timeRange} days.
                  </p>
                </CardContent>
              </Card>
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
                                <Badge
                                  variant="outline"
                                  className="text-xs capitalize"
                                >
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
                    <a
                      href="https://www.gdacs.org"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      GDACS
                    </a>
                    {" • "}
                    <a
                      href="https://earthquake.usgs.gov"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      USGS
                    </a>
                    {" • "}
                    <a
                      href="https://reliefweb.int"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
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
        </section>

        {/* Premium Bundle Card */}
        <section className="py-12 bg-white">
          <div className="container max-w-4xl mx-auto px-4">
            <Card className="border-2 border-primary/20 bg-gradient-to-br from-white to-sky-50">
              <CardHeader className="text-center">
                <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mx-auto mb-2">
                  <Zap className="h-4 w-4" />
                  Premium
                </div>
                <CardTitle className="text-2xl">Personalized Resiliency Plan</CardTitle>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <span className="text-3xl font-bold text-primary">€49</span>
                  <span className="text-muted-foreground">one-time</span>
                </div>
                <p className="text-sm text-muted-foreground">No subscription</p>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-4 mb-6">
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Printable offline plan PDF</p>
                      <p className="text-sm text-muted-foreground">Red Folder format</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Database className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Encrypted Vault</p>
                      <p className="text-sm text-muted-foreground">IDs, contacts, medical basics</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Plans A & B</p>
                      <p className="text-sm text-muted-foreground">Exit + emergency routes</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <RefreshCw className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Encrypted backup & restore</p>
                      <p className="text-sm text-muted-foreground">Secure cloud sync</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Zap className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Premium insights</p>
                      <p className="text-sm text-muted-foreground">Personalized next steps</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Bell className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Real-time risk alerts</p>
                      <p className="text-sm text-muted-foreground">Calm, personalized</p>
                    </div>
                  </div>
                </div>

                {/* Alerts Module */}
                <div className="border-t pt-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Real-time Risk Alerts
                  </h3>
                  
                  {isPremium ? (
                    <div className="bg-slate-50 rounded-xl p-4">
                      <p className="text-sm text-muted-foreground mb-4">
                        Configure your personalized alerts below.
                      </p>
                      {/* Alert preferences UI - stub for MVP */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Enable alerts</span>
                          <input type="checkbox" className="rounded" disabled />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Coming soon: email and in-app notifications.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 rounded-xl p-6 text-center">
                      <Lock className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground mb-4">
                        Alerts are included in Premium — along with Vault and your printable plan.
                      </p>
                      <Button onClick={() => navigate("/pricing")}>
                        Unlock Premium (€49)
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <Footer />
      
      <LoginModal open={loginModalOpen} onOpenChange={setLoginModalOpen} />
    </div>
  );
}

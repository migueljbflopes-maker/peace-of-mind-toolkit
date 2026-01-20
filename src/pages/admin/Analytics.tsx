import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, RefreshCw, TrendingDown, TrendingUp, AlertTriangle, ArrowRight, Trophy } from 'lucide-react';
import { format, subDays, startOfDay } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { FUNNEL_STEP_NAMES } from '@/lib/trackFeature';

interface PageStats {
  path: string;
  views: number;
  uniqueSessions: number;
}

interface DailyViews {
  date: string;
  views: number;
}

interface FunnelStep {
  name: string;
  count: number;
  percentage: number;
}

interface FunnelStepAnalytics {
  step: number;
  step_name: string;
  views: number;
  completes: number;
  dropOff: number;
  retentionRate: number;
}

interface ABCompareData {
  riskfunnel: FunnelStepAnalytics[];
  riskfunnel1: FunnelStepAnalytics[];
  riskfunnelCheckouts: number;
  riskfunnel1Checkouts: number;
}

export default function AdminAnalytics() {
  const [loading, setLoading] = useState(true);
  const [topPages, setTopPages] = useState<PageStats[]>([]);
  const [dailyViews, setDailyViews] = useState<DailyViews[]>([]);
  const [funnel, setFunnel] = useState<FunnelStep[]>([]);
  
  // Funnel Steps state
  const [funnelStepsLoading, setFunnelStepsLoading] = useState(false);
  const [selectedFunnel, setSelectedFunnel] = useState<'riskfunnel' | 'riskfunnel1' | 'all'>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<'7' | '14' | '30'>('7');
  const [funnelSteps, setFunnelSteps] = useState<FunnelStepAnalytics[]>([]);
  const [checkoutClicks, setCheckoutClicks] = useState(0);
  const [worstDropOff, setWorstDropOff] = useState<string | null>(null);
  
  // A/B Compare state
  const [abLoading, setAbLoading] = useState(false);
  const [abPeriod, setAbPeriod] = useState<'7' | '14' | '30'>('7');
  const [abData, setAbData] = useState<ABCompareData | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const sevenDaysAgo = startOfDay(subDays(new Date(), 7));

        // Get all page views from last 7 days
        const { data: pageViews, error } = await supabase
          .from('page_views')
          .select('path, session_id, created_at')
          .gte('created_at', sevenDaysAgo.toISOString())
          .order('created_at', { ascending: true });

        if (error) throw error;

        // Calculate top pages
        const pageMap = new Map<string, { views: number; sessions: Set<string> }>();
        pageViews?.forEach((pv) => {
          const existing = pageMap.get(pv.path) || { views: 0, sessions: new Set() };
          existing.views++;
          if (pv.session_id) existing.sessions.add(pv.session_id);
          pageMap.set(pv.path, existing);
        });

        const topPagesData: PageStats[] = Array.from(pageMap.entries())
          .map(([path, data]) => ({
            path,
            views: data.views,
            uniqueSessions: data.sessions.size,
          }))
          .sort((a, b) => b.views - a.views)
          .slice(0, 20);

        setTopPages(topPagesData);

        // Calculate daily views
        const dailyMap = new Map<string, number>();
        pageViews?.forEach((pv) => {
          const date = format(new Date(pv.created_at), 'MM/dd');
          dailyMap.set(date, (dailyMap.get(date) || 0) + 1);
        });

        const dailyData: DailyViews[] = Array.from(dailyMap.entries())
          .map(([date, views]) => ({ date, views }))
          .sort((a, b) => a.date.localeCompare(b.date));

        setDailyViews(dailyData);

        // Calculate funnel
        const homeSessions = new Set(pageViews?.filter(p => p.path === '/').map(p => p.session_id));
        const riskSessions = new Set(pageViews?.filter(p => p.path === '/tools/risk').map(p => p.session_id));
        const suppliesSessions = new Set(pageViews?.filter(p => p.path === '/tools/supplies').map(p => p.session_id));
        const pricingSessions = new Set(pageViews?.filter(p => p.path === '/pricing').map(p => p.session_id));

        const homeCount = homeSessions.size;
        const funnelData: FunnelStep[] = [
          { name: 'Homepage', count: homeCount, percentage: 100 },
          { name: 'Risk Calculator', count: riskSessions.size, percentage: homeCount ? (riskSessions.size / homeCount) * 100 : 0 },
          { name: 'Supplies Planner', count: suppliesSessions.size, percentage: homeCount ? (suppliesSessions.size / homeCount) * 100 : 0 },
          { name: 'Pricing Page', count: pricingSessions.size, percentage: homeCount ? (pricingSessions.size / homeCount) * 100 : 0 },
        ];

        setFunnel(funnelData);
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, []);

  const fetchFunnelSteps = async () => {
    setFunnelStepsLoading(true);
    try {
      const daysAgo = startOfDay(subDays(new Date(), parseInt(selectedPeriod)));
      
      // Fetch feature usage for risk_funnel
      const { data: featureData, error } = await supabase
        .from('feature_usage')
        .select('action, metadata, session_id')
        .eq('feature_name', 'risk_funnel')
        .gte('created_at', daysAgo.toISOString());

      if (error) throw error;

      // Filter by funnel if not "all"
      const filteredData = selectedFunnel === 'all' 
        ? featureData 
        : featureData?.filter(f => {
            const meta = f.metadata as Record<string, unknown> | null;
            return meta?.funnel === selectedFunnel;
          });

      // Group by step
      const stepMap = new Map<number, { views: Set<string>; completes: Set<string> }>();
      
      // Initialize all 10 steps
      for (let i = 1; i <= 10; i++) {
        stepMap.set(i, { views: new Set(), completes: new Set() });
      }

      filteredData?.forEach((f) => {
        const meta = f.metadata as Record<string, unknown> | null;
        const step = meta?.step as number;
        if (!step || step < 1 || step > 10) return;
        
        const sessionId = f.session_id || 'unknown';
        const existing = stepMap.get(step) || { views: new Set(), completes: new Set() };
        
        if (f.action === 'step_view') {
          existing.views.add(sessionId);
        } else if (f.action === 'step_complete') {
          existing.completes.add(sessionId);
        }
        
        stepMap.set(step, existing);
      });

      // Calculate metrics
      const stepsAnalytics: FunnelStepAnalytics[] = [];
      let firstStepViews = stepMap.get(1)?.views.size || 0;
      let maxDropOff = 0;
      let maxDropOffStep = '';

      for (let i = 1; i <= 10; i++) {
        const stepData = stepMap.get(i);
        const views = stepData?.views.size || 0;
        const completes = stepData?.completes.size || 0;
        const dropOff = views - completes;
        const retentionRate = firstStepViews > 0 ? (views / firstStepViews) * 100 : 0;
        
        const stepName = FUNNEL_STEP_NAMES[i] || `step_${i}`;
        
        if (dropOff > maxDropOff && i < 10) { // Don't count results as drop-off
          maxDropOff = dropOff;
          maxDropOffStep = stepName;
        }

        stepsAnalytics.push({
          step: i,
          step_name: stepName,
          views,
          completes,
          dropOff,
          retentionRate,
        });
      }

      setFunnelSteps(stepsAnalytics);
      setWorstDropOff(maxDropOffStep);

      // Count checkout clicks
      const checkoutCount = filteredData?.filter(f => f.action === 'checkout_click').length || 0;
      setCheckoutClicks(checkoutCount);

    } catch (error) {
      console.error('Error fetching funnel steps:', error);
    } finally {
      setFunnelStepsLoading(false);
    }
  };

  // Fetch funnel steps on tab change or filter change
  useEffect(() => {
    fetchFunnelSteps();
  }, [selectedFunnel, selectedPeriod]);

  // Fetch A/B compare data
  const fetchABCompare = async () => {
    setAbLoading(true);
    try {
      const daysAgo = startOfDay(subDays(new Date(), parseInt(abPeriod)));
      
      const { data: featureData, error } = await supabase
        .from('feature_usage')
        .select('action, metadata, session_id')
        .eq('feature_name', 'risk_funnel')
        .gte('created_at', daysAgo.toISOString());

      if (error) throw error;

      const processForFunnel = (funnelName: string): { steps: FunnelStepAnalytics[]; checkouts: number } => {
        const filtered = featureData?.filter(f => {
          const meta = f.metadata as Record<string, unknown> | null;
          return meta?.funnel === funnelName;
        }) || [];

        const stepMap = new Map<number, { views: Set<string>; completes: Set<string> }>();
        for (let i = 1; i <= 10; i++) {
          stepMap.set(i, { views: new Set(), completes: new Set() });
        }

        filtered.forEach((f) => {
          const meta = f.metadata as Record<string, unknown> | null;
          const step = meta?.step as number;
          if (!step || step < 1 || step > 10) return;
          
          const sessionId = f.session_id || 'unknown';
          const existing = stepMap.get(step)!;
          
          if (f.action === 'step_view') {
            existing.views.add(sessionId);
          } else if (f.action === 'step_complete') {
            existing.completes.add(sessionId);
          }
        });

        const firstStepViews = stepMap.get(1)?.views.size || 0;
        const steps: FunnelStepAnalytics[] = [];

        for (let i = 1; i <= 10; i++) {
          const stepData = stepMap.get(i)!;
          const views = stepData.views.size;
          const completes = stepData.completes.size;
          steps.push({
            step: i,
            step_name: FUNNEL_STEP_NAMES[i] || `step_${i}`,
            views,
            completes,
            dropOff: views - completes,
            retentionRate: firstStepViews > 0 ? (views / firstStepViews) * 100 : 0,
          });
        }

        const checkouts = filtered.filter(f => f.action === 'checkout_click').length;
        return { steps, checkouts };
      };

      const rf = processForFunnel('riskfunnel');
      const rf1 = processForFunnel('riskfunnel1');

      setAbData({
        riskfunnel: rf.steps,
        riskfunnel1: rf1.steps,
        riskfunnelCheckouts: rf.checkouts,
        riskfunnel1Checkouts: rf1.checkouts,
      });
    } catch (error) {
      console.error('Error fetching A/B compare:', error);
    } finally {
      setAbLoading(false);
    }
  };

  useEffect(() => {
    fetchABCompare();
  }, [abPeriod]);

  if (loading) {
    return (
      <AdminLayout title="Analytics">
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  const getStepDisplayName = (stepName: string): string => {
    const displayNames: Record<string, string> = {
      location: '1. Location',
      home_type: '2. Home Type',
      household: '3. Household',
      emergency_experience: '4. Emergency Experience',
      interstitial_1: '5. Interstitial 1',
      emergency_kit: '6. Emergency Kit',
      evacuation_plan: '7. Evacuation Plan',
      interstitial_2: '8. Interstitial 2',
      analyzing: '9. Analyzing',
      results: '10. Results',
    };
    return displayNames[stepName] || stepName;
  };

  const resultsViews = funnelSteps.find(s => s.step === 10)?.views || 0;
  const checkoutRate = resultsViews > 0 ? ((checkoutClicks / resultsViews) * 100).toFixed(1) : '0';

  return (
    <AdminLayout title="Analytics">
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pages">Top Pages</TabsTrigger>
          <TabsTrigger value="funnel">Funnel</TabsTrigger>
          <TabsTrigger value="funnel-steps">Funnel Steps</TabsTrigger>
          <TabsTrigger value="ab-compare">A/B Compare</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Page Views (Last 7 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyViews}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="views" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pages">
          <Card>
            <CardHeader>
              <CardTitle>Top Pages (Last 7 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Path</TableHead>
                    <TableHead className="text-right">Views</TableHead>
                    <TableHead className="text-right">Unique Sessions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topPages.map((page) => (
                    <TableRow key={page.path}>
                      <TableCell className="font-mono text-sm">{page.path}</TableCell>
                      <TableCell className="text-right">{page.views}</TableCell>
                      <TableCell className="text-right">{page.uniqueSessions}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="funnel">
          <Card>
            <CardHeader>
              <CardTitle>Conversion Funnel (Last 7 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {funnel.map((step, index) => (
                  <div key={step.name} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{step.name}</span>
                      <span className="text-muted-foreground">
                        {step.count} sessions ({step.percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="h-8 bg-muted rounded overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${step.percentage}%` }}
                      />
                    </div>
                    {index < funnel.length - 1 && (
                      <div className="text-center text-xs text-muted-foreground">↓</div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="funnel-steps" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Funnel:</span>
                  <Select value={selectedFunnel} onValueChange={(v) => setSelectedFunnel(v as typeof selectedFunnel)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Funnels</SelectItem>
                      <SelectItem value="riskfunnel">RiskFunnel (One-time)</SelectItem>
                      <SelectItem value="riskfunnel1">RiskFunnel1 (Subscription)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Period:</span>
                  <Select value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as typeof selectedPeriod)}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">Last 7 days</SelectItem>
                      <SelectItem value="14">Last 14 days</SelectItem>
                      <SelectItem value="30">Last 30 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" size="sm" onClick={fetchFunnelSteps} disabled={funnelStepsLoading}>
                  {funnelStepsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  <span className="ml-2">Refresh</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Funnel Starts</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{funnelSteps[0]?.views || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Checkout Clicks</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{checkoutClicks}</p>
                <p className="text-xs text-muted-foreground">{checkoutRate}% of results viewers</p>
              </CardContent>
            </Card>
            <Card className={worstDropOff ? "border-destructive/50" : ""}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Biggest Drop-off
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold">{worstDropOff ? getStepDisplayName(worstDropOff) : 'N/A'}</p>
              </CardContent>
            </Card>
          </div>

          {/* Step-by-step breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Step-by-Step Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              {funnelStepsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-4">
                  {funnelSteps.map((step, index) => {
                    const isWorstDropOff = step.step_name === worstDropOff;
                    return (
                      <div key={step.step} className={`space-y-2 ${isWorstDropOff ? 'bg-destructive/5 -mx-4 px-4 py-2 rounded-lg' : ''}`}>
                        <div className="flex justify-between text-sm">
                          <span className="font-medium flex items-center gap-2">
                            {getStepDisplayName(step.step_name)}
                            {isWorstDropOff && <TrendingDown className="h-4 w-4 text-destructive" />}
                          </span>
                          <span className="text-muted-foreground">
                            {step.views} views | {step.completes} completes | 
                            <span className={step.dropOff > 20 ? ' text-destructive font-medium' : ''}>
                              {' '}{step.dropOff} drop-off
                            </span>
                          </span>
                        </div>
                        <div className="h-6 bg-muted rounded overflow-hidden relative">
                          <div
                            className="h-full bg-primary/70 transition-all"
                            style={{ width: `${step.retentionRate}%` }}
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium">
                            {step.retentionRate.toFixed(1)}%
                          </span>
                        </div>
                        {index < funnelSteps.length - 1 && (
                          <div className="text-center text-xs text-muted-foreground">↓</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ab-compare" className="space-y-4">
          {/* Period Filter */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Period:</span>
                  <Select value={abPeriod} onValueChange={(v) => setAbPeriod(v as typeof abPeriod)}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">Last 7 days</SelectItem>
                      <SelectItem value="14">Last 14 days</SelectItem>
                      <SelectItem value="30">Last 30 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" size="sm" onClick={fetchABCompare} disabled={abLoading}>
                  {abLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  <span className="ml-2">Refresh</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {abLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : abData ? (
            <>
              {/* Key Metrics Comparison */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="border-blue-500/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">A</Badge>
                      RiskFunnel (One-time €49)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold">{abData.riskfunnel[0]?.views || 0}</p>
                        <p className="text-xs text-muted-foreground">Starts</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{abData.riskfunnel[9]?.views || 0}</p>
                        <p className="text-xs text-muted-foreground">Results</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{abData.riskfunnelCheckouts}</p>
                        <p className="text-xs text-muted-foreground">Checkouts</p>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Conversion Rate</span>
                        <span className="text-lg font-semibold">
                          {abData.riskfunnel[0]?.views ? ((abData.riskfunnelCheckouts / abData.riskfunnel[0].views) * 100).toFixed(1) : '0'}%
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-green-500/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">B</Badge>
                      RiskFunnel1 (Subscription)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold">{abData.riskfunnel1[0]?.views || 0}</p>
                        <p className="text-xs text-muted-foreground">Starts</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{abData.riskfunnel1[9]?.views || 0}</p>
                        <p className="text-xs text-muted-foreground">Results</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{abData.riskfunnel1Checkouts}</p>
                        <p className="text-xs text-muted-foreground">Checkouts</p>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Conversion Rate</span>
                        <span className="text-lg font-semibold">
                          {abData.riskfunnel1[0]?.views ? ((abData.riskfunnel1Checkouts / abData.riskfunnel1[0].views) * 100).toFixed(1) : '0'}%
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Winner Banner */}
              {(() => {
                const rfConv = abData.riskfunnel[0]?.views ? (abData.riskfunnelCheckouts / abData.riskfunnel[0].views) * 100 : 0;
                const rf1Conv = abData.riskfunnel1[0]?.views ? (abData.riskfunnel1Checkouts / abData.riskfunnel1[0].views) * 100 : 0;
                const diff = Math.abs(rfConv - rf1Conv).toFixed(1);
                const winner = rfConv > rf1Conv ? 'A' : rf1Conv > rfConv ? 'B' : null;
                const winnerName = winner === 'A' ? 'RiskFunnel (One-time)' : winner === 'B' ? 'RiskFunnel1 (Subscription)' : null;
                
                if (!winner || parseFloat(diff) < 0.5) return null;
                
                return (
                  <Card className="bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border-yellow-500/30">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-center gap-3">
                        <Trophy className="h-5 w-5 text-yellow-600" />
                        <span className="font-medium">
                          Variant {winner} ({winnerName}) is winning by {diff}% conversion rate
                        </span>
                        {rfConv > rf1Conv ? (
                          <TrendingUp className="h-5 w-5 text-green-600" />
                        ) : (
                          <TrendingUp className="h-5 w-5 text-green-600" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Side-by-Side Step Comparison Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Retention Rate by Step</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(step => ({
                          step: getStepDisplayName(FUNNEL_STEP_NAMES[step] || `step_${step}`),
                          'RiskFunnel (A)': abData.riskfunnel.find(s => s.step === step)?.retentionRate || 0,
                          'RiskFunnel1 (B)': abData.riskfunnel1.find(s => s.step === step)?.retentionRate || 0,
                        }))}
                        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="step" 
                          angle={-45} 
                          textAnchor="end" 
                          height={80}
                          tick={{ fontSize: 11 }}
                        />
                        <YAxis 
                          domain={[0, 100]} 
                          tickFormatter={(v) => `${v}%`}
                        />
                        <Tooltip 
                          formatter={(value: number) => `${value.toFixed(1)}%`}
                        />
                        <Legend />
                        <Bar dataKey="RiskFunnel (A)" fill="hsl(217, 91%, 60%)" />
                        <Bar dataKey="RiskFunnel1 (B)" fill="hsl(142, 71%, 45%)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Step-by-Step Detailed Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Detailed Step Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Step</TableHead>
                        <TableHead className="text-center" colSpan={2}>
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">A</Badge>
                          <span className="ml-2">RiskFunnel</span>
                        </TableHead>
                        <TableHead className="text-center" colSpan={2}>
                          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">B</Badge>
                          <span className="ml-2">RiskFunnel1</span>
                        </TableHead>
                        <TableHead className="text-center">Winner</TableHead>
                      </TableRow>
                      <TableRow>
                        <TableHead></TableHead>
                        <TableHead className="text-right text-xs">Views</TableHead>
                        <TableHead className="text-right text-xs">Retention</TableHead>
                        <TableHead className="text-right text-xs">Views</TableHead>
                        <TableHead className="text-right text-xs">Retention</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(stepNum => {
                        const rfStep = abData.riskfunnel.find(s => s.step === stepNum);
                        const rf1Step = abData.riskfunnel1.find(s => s.step === stepNum);
                        const rfRetention = rfStep?.retentionRate || 0;
                        const rf1Retention = rf1Step?.retentionRate || 0;
                        const winner = rfRetention > rf1Retention ? 'A' : rf1Retention > rfRetention ? 'B' : null;
                        
                        return (
                          <TableRow key={stepNum}>
                            <TableCell className="font-medium">
                              {getStepDisplayName(FUNNEL_STEP_NAMES[stepNum] || `step_${stepNum}`)}
                            </TableCell>
                            <TableCell className="text-right">{rfStep?.views || 0}</TableCell>
                            <TableCell className="text-right">{rfRetention.toFixed(1)}%</TableCell>
                            <TableCell className="text-right">{rf1Step?.views || 0}</TableCell>
                            <TableCell className="text-right">{rf1Retention.toFixed(1)}%</TableCell>
                            <TableCell className="text-center">
                              {winner && Math.abs(rfRetention - rf1Retention) > 2 ? (
                                <Badge 
                                  variant="outline" 
                                  className={winner === 'A' 
                                    ? 'bg-blue-500/10 text-blue-600 border-blue-500/30' 
                                    : 'bg-green-500/10 text-green-600 border-green-500/30'
                                  }
                                >
                                  {winner}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          ) : null}
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}

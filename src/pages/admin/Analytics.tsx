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
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { format, subDays, startOfDay } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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

export default function AdminAnalytics() {
  const [loading, setLoading] = useState(true);
  const [topPages, setTopPages] = useState<PageStats[]>([]);
  const [dailyViews, setDailyViews] = useState<DailyViews[]>([]);
  const [funnel, setFunnel] = useState<FunnelStep[]>([]);

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

  if (loading) {
    return (
      <AdminLayout title="Analytics">
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Analytics">
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pages">Top Pages</TabsTrigger>
          <TabsTrigger value="funnel">Funnel</TabsTrigger>
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
      </Tabs>
    </AdminLayout>
  );
}

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { startOfDay, subDays } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface FeatureStats {
  feature_name: string;
  total: number;
  starts: number;
  completes: number;
  completionRate: number;
}

interface ActionBreakdown {
  action: string;
  count: number;
}

export default function AdminFeatures() {
  const [loading, setLoading] = useState(true);
  const [featureStats, setFeatureStats] = useState<FeatureStats[]>([]);
  const [chartData, setChartData] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    async function fetchFeatureUsage() {
      try {
        const sevenDaysAgo = startOfDay(subDays(new Date(), 7));

        const { data, error } = await supabase
          .from('feature_usage')
          .select('feature_name, action')
          .gte('created_at', sevenDaysAgo.toISOString());

        if (error) throw error;

        // Aggregate by feature
        const featureMap = new Map<string, { total: number; starts: number; completes: number }>();
        
        data?.forEach((item) => {
          const existing = featureMap.get(item.feature_name) || { total: 0, starts: 0, completes: 0 };
          existing.total++;
          if (item.action === 'start') existing.starts++;
          if (item.action === 'complete') existing.completes++;
          featureMap.set(item.feature_name, existing);
        });

        const statsData: FeatureStats[] = Array.from(featureMap.entries())
          .map(([feature_name, stats]) => ({
            feature_name,
            total: stats.total,
            starts: stats.starts,
            completes: stats.completes,
            completionRate: stats.starts > 0 ? (stats.completes / stats.starts) * 100 : 0,
          }))
          .sort((a, b) => b.total - a.total);

        setFeatureStats(statsData);

        // Chart data
        const chartDataFormatted = statsData.slice(0, 10).map((s) => ({
          name: s.feature_name.replace(/_/g, ' '),
          value: s.total,
        }));
        setChartData(chartDataFormatted);
      } catch (error) {
        console.error('Error fetching feature usage:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchFeatureUsage();
  }, []);

  if (loading) {
    return (
      <AdminLayout title="Feature Usage">
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Feature Usage">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Feature Usage (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Feature Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Feature</TableHead>
                  <TableHead className="text-right">Total Events</TableHead>
                  <TableHead className="text-right">Starts</TableHead>
                  <TableHead className="text-right">Completes</TableHead>
                  <TableHead className="text-right">Completion Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {featureStats.map((stat) => (
                  <TableRow key={stat.feature_name}>
                    <TableCell className="font-medium capitalize">
                      {stat.feature_name.replace(/_/g, ' ')}
                    </TableCell>
                    <TableCell className="text-right">{stat.total}</TableCell>
                    <TableCell className="text-right">{stat.starts}</TableCell>
                    <TableCell className="text-right">{stat.completes}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={stat.completionRate > 50 ? 'default' : 'secondary'}>
                        {stat.completionRate.toFixed(1)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {featureStats.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No feature usage data yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

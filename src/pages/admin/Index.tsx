import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Users, Eye, Zap, CreditCard, Loader2 } from 'lucide-react';

interface Stats {
  totalUsers: number;
  premiumUsers: number;
  pageViewsToday: number;
  featureUsageToday: number;
}

export default function AdminIndex() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [usersRes, premiumRes, pageViewsRes, featureRes] = await Promise.all([
          // Total users - count from auth table via profiles
          supabase.from('user_profiles').select('user_id', { count: 'exact', head: true }),
          // Premium users
          supabase.from('premium_entitlements').select('user_id', { count: 'exact', head: true }).eq('is_premium', true),
          // Page views today
          supabase.from('page_views').select('id', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
          // Feature usage today
          supabase.from('feature_usage').select('id', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
        ]);

        setStats({
          totalUsers: usersRes.count || 0,
          premiumUsers: premiumRes.count || 0,
          pageViewsToday: pageViewsRes.count || 0,
          featureUsageToday: featureRes.count || 0,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  return (
    <AdminLayout title="Dashboard Overview">
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
              <p className="text-xs text-muted-foreground">Registered accounts</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Premium Users</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.premiumUsers || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.totalUsers ? ((stats.premiumUsers / stats.totalUsers) * 100).toFixed(1) : 0}% conversion
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Page Views Today</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.pageViewsToday || 0}</div>
              <p className="text-xs text-muted-foreground">Since midnight</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Feature Usage Today</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.featureUsageToday || 0}</div>
              <p className="text-xs text-muted-foreground">Interactions tracked</p>
            </CardContent>
          </Card>
        </div>
      )}
    </AdminLayout>
  );
}

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Search, Crown, Trash2, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface UserData {
  user_id: string;
  email: string | null;
  created_at: string;
  is_premium: boolean;
  premium_granted_at: string | null;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<UserData | null>(null);

  const fetchUsers = async () => {
    try {
      // Get user profiles with premium status
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('user_id, created_at')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Get premium entitlements
      const { data: entitlements, error: entitlementsError } = await supabase
        .from('premium_entitlements')
        .select('user_id, is_premium, granted_at');

      if (entitlementsError) throw entitlementsError;

      // Get emails from edge function
      const { data: emailsData, error: emailsError } = await supabase.functions.invoke(
        'admin-manage-user',
        { body: { action: 'list_users' } }
      );

      const emailMap: Record<string, string> = {};
      if (!emailsError && emailsData?.users) {
        emailsData.users.forEach((u: { id: string; email: string }) => {
          emailMap[u.id] = u.email;
        });
      }

      // Combine data
      const premiumMap = new Map(
        entitlements?.map((e) => [e.user_id, { is_premium: e.is_premium, granted_at: e.granted_at }]) || []
      );

      const combinedUsers: UserData[] = (profiles || []).map((p) => {
        const premium = premiumMap.get(p.user_id);
        return {
          user_id: p.user_id,
          email: emailMap[p.user_id] || null,
          created_at: p.created_at,
          is_premium: premium?.is_premium || false,
          premium_granted_at: premium?.granted_at || null,
        };
      });

      setUsers(combinedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUpgrade = async (userId: string) => {
    setActionLoading(userId);
    try {
      const { error } = await supabase.functions.invoke('admin-manage-user', {
        body: { action: 'upgrade_premium', user_id: userId },
      });

      if (error) throw error;
      toast.success('User upgraded to premium');
      fetchUsers();
    } catch (error) {
      console.error('Error upgrading user:', error);
      toast.error('Failed to upgrade user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevoke = async (userId: string) => {
    setActionLoading(userId);
    try {
      const { error } = await supabase.functions.invoke('admin-manage-user', {
        body: { action: 'revoke_premium', user_id: userId },
      });

      if (error) throw error;
      toast.success('Premium access revoked');
      fetchUsers();
    } catch (error) {
      console.error('Error revoking premium:', error);
      toast.error('Failed to revoke premium');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    
    setActionLoading(deleteConfirm.user_id);
    try {
      const { error } = await supabase.functions.invoke('admin-manage-user', {
        body: { action: 'delete_user', user_id: deleteConfirm.user_id },
      });

      if (error) throw error;
      toast.success('User deleted');
      setDeleteConfirm(null);
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredUsers = users.filter((u) =>
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.user_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout title="User Management">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Users ({users.length})</span>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Premium Since</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.user_id}>
                    <TableCell className="font-medium">
                      {user.email || (
                        <span className="text-muted-foreground text-xs">{user.user_id.slice(0, 8)}...</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.is_premium ? (
                        <Badge className="bg-amber-500">
                          <Crown className="mr-1 h-3 w-3" />
                          Premium
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Free</Badge>
                      )}
                    </TableCell>
                    <TableCell>{format(new Date(user.created_at), 'PP')}</TableCell>
                    <TableCell>
                      {user.premium_granted_at
                        ? format(new Date(user.premium_granted_at), 'PP')
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {user.is_premium ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRevoke(user.user_id)}
                          disabled={actionLoading === user.user_id}
                        >
                          {actionLoading === user.user_id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <UserX className="mr-1 h-4 w-4" />
                              Revoke
                            </>
                          )}
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpgrade(user.user_id)}
                          disabled={actionLoading === user.user_id}
                        >
                          {actionLoading === user.user_id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Crown className="mr-1 h-4 w-4" />
                              Upgrade
                            </>
                          )}
                        </Button>
                      )}
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteConfirm(user)}
                        disabled={actionLoading === user.user_id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No users found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteConfirm?.email}</strong>? This action cannot be undone and will remove all user data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface AffiliateLink {
  id: string;
  product_id: string;
  market: string;
  affiliate_tag: string;
  base_url: string | null;
  created_at: string;
}

const MARKETS = ['US', 'UK', 'DE', 'FR', 'ES', 'IT', 'PT'];

export default function AdminAffiliates() {
  const [links, setLinks] = useState<AffiliateLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<AffiliateLink | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [productId, setProductId] = useState('');
  const [market, setMarket] = useState('US');
  const [affiliateTag, setAffiliateTag] = useState('');
  const [baseUrl, setBaseUrl] = useState('');

  const fetchLinks = async () => {
    try {
      const { data, error } = await supabase
        .from('affiliate_links')
        .select('*')
        .order('product_id', { ascending: true });

      if (error) throw error;
      setLinks(data || []);
    } catch (error) {
      console.error('Error fetching affiliate links:', error);
      toast.error('Failed to load affiliate links');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  const openDialog = (link?: AffiliateLink) => {
    if (link) {
      setEditingLink(link);
      setProductId(link.product_id);
      setMarket(link.market);
      setAffiliateTag(link.affiliate_tag);
      setBaseUrl(link.base_url || '');
    } else {
      setEditingLink(null);
      setProductId('');
      setMarket('US');
      setAffiliateTag('');
      setBaseUrl('');
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!productId || !affiliateTag) {
      toast.error('Product ID and Affiliate Tag are required');
      return;
    }

    setSaving(true);
    try {
      if (editingLink) {
        const { error } = await supabase
          .from('affiliate_links')
          .update({
            product_id: productId,
            market,
            affiliate_tag: affiliateTag,
            base_url: baseUrl || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingLink.id);

        if (error) throw error;
        toast.success('Affiliate link updated');
      } else {
        const { error } = await supabase.from('affiliate_links').insert({
          product_id: productId,
          market,
          affiliate_tag: affiliateTag,
          base_url: baseUrl || null,
        });

        if (error) throw error;
        toast.success('Affiliate link created');
      }

      setDialogOpen(false);
      fetchLinks();
    } catch (error: any) {
      console.error('Error saving affiliate link:', error);
      if (error.code === '23505') {
        toast.error('A link for this product/market combination already exists');
      } else {
        toast.error('Failed to save affiliate link');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('affiliate_links').delete().eq('id', id);
      if (error) throw error;
      toast.success('Affiliate link deleted');
      fetchLinks();
    } catch (error) {
      console.error('Error deleting affiliate link:', error);
      toast.error('Failed to delete affiliate link');
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Affiliate Links">
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Affiliate Links">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Affiliate Links ({links.length})</span>
            <Button onClick={() => openDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Link
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product ID</TableHead>
                <TableHead>Market</TableHead>
                <TableHead>Affiliate Tag</TableHead>
                <TableHead>Base URL</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {links.map((link) => (
                <TableRow key={link.id}>
                  <TableCell className="font-mono text-sm">{link.product_id}</TableCell>
                  <TableCell>{link.market}</TableCell>
                  <TableCell className="font-mono text-sm">{link.affiliate_tag}</TableCell>
                  <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                    {link.base_url || '-'}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => openDialog(link)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(link.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {links.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No affiliate links configured
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLink ? 'Edit Affiliate Link' : 'Add Affiliate Link'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="productId">Product ID</Label>
              <Input
                id="productId"
                placeholder="e.g., emergency-radio"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="market">Market</Label>
              <Select value={market} onValueChange={setMarket}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MARKETS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="affiliateTag">Affiliate Tag</Label>
              <Input
                id="affiliateTag"
                placeholder="e.g., mysite-20"
                value={affiliateTag}
                onChange={(e) => setAffiliateTag(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="baseUrl">Base URL (optional)</Label>
              <Input
                id="baseUrl"
                placeholder="https://amazon.com/dp/BXXXXXX"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

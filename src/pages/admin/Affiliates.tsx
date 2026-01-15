import { useEffect, useState, useMemo } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { 
  Loader2, 
  Plus, 
  Pencil, 
  Trash2, 
  Search, 
  ExternalLink, 
  Check,
  X,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface AffiliateLink {
  id: string;
  product_id: string;
  market: string;
  affiliate_tag: string;
  base_url: string | null;
  created_at: string;
}

interface Product {
  id: string;
  category: string;
  name: string;
  importance: 'Must-have' | 'Good-to-have';
  searchQuery: string;
}

const MARKETS = ['US', 'UK', 'DE', 'NL'] as const;
type Market = typeof MARKETS[number];

// Product catalog from AmazonProductsSection
const productCatalog: Product[] = [
  // Water & Purification
  { id: "water-container-10l", category: "Water & Purification", name: "Collapsible Water Container (10L)", importance: "Must-have", searchQuery: "collapsible water container 10L" },
  { id: "water-filter-portable", category: "Water & Purification", name: "Portable Water Filter", importance: "Must-have", searchQuery: "portable water filter emergency" },
  { id: "water-purification-tablets", category: "Water & Purification", name: "Water Purification Tablets", importance: "Good-to-have", searchQuery: "water purification tablets" },
  // Power & Charging
  { id: "power-bank-20000", category: "Power & Charging", name: "Power Bank (20,000mAh)", importance: "Must-have", searchQuery: "power bank 20000mah" },
  { id: "solar-charger", category: "Power & Charging", name: "Solar Charger Panel", importance: "Good-to-have", searchQuery: "solar charger panel portable" },
  { id: "battery-charger", category: "Power & Charging", name: "Battery Charger + Spare Batteries", importance: "Must-have", searchQuery: "rechargeable battery charger AA AAA" },
  // Lighting
  { id: "headlamp-led", category: "Lighting", name: "LED Headlamp (Rechargeable)", importance: "Must-have", searchQuery: "LED headlamp rechargeable" },
  { id: "lantern-camping", category: "Lighting", name: "Camping Lantern", importance: "Good-to-have", searchQuery: "camping lantern LED" },
  { id: "flashlight-tactical", category: "Lighting", name: "Tactical Flashlight", importance: "Good-to-have", searchQuery: "tactical flashlight LED" },
  // Communication
  { id: "emergency-radio", category: "Communication", name: "Emergency Crank Radio (AM/FM)", importance: "Must-have", searchQuery: "emergency crank radio AM FM" },
  { id: "whistle-emergency", category: "Communication", name: "Emergency Whistle (Set of 2)", importance: "Good-to-have", searchQuery: "emergency whistle loud" },
  // First Aid & Medical
  { id: "first-aid-kit-complete", category: "First Aid & Medical", name: "Complete First Aid Kit", importance: "Must-have", searchQuery: "first aid kit complete" },
  { id: "thermometer-digital", category: "First Aid & Medical", name: "Digital Thermometer", importance: "Good-to-have", searchQuery: "digital thermometer medical" },
  // Hygiene & Sanitation
  { id: "toilet-bags", category: "Hygiene & Sanitation", name: "Emergency Toilet Bags", importance: "Good-to-have", searchQuery: "emergency toilet bags portable" },
  { id: "hand-sanitizer-large", category: "Hygiene & Sanitation", name: "Hand Sanitizer (Large Bottle)", importance: "Good-to-have", searchQuery: "hand sanitizer 500ml" },
  // Cooking & Utilities
  { id: "camping-stove-portable", category: "Cooking & Utilities", name: "Portable Camping Stove", importance: "Must-have", searchQuery: "portable camping stove butane" },
  { id: "fuel-canisters", category: "Cooking & Utilities", name: "Fuel Canisters (Pack of 4)", importance: "Good-to-have", searchQuery: "butane fuel canisters camping" },
  { id: "can-opener-manual", category: "Cooking & Utilities", name: "Manual Can Opener", importance: "Must-have", searchQuery: "manual can opener durable" },
  // Warmth & Shelter
  { id: "emergency-blankets", category: "Warmth & Shelter", name: "Emergency Mylar Blankets (Pack of 10)", importance: "Must-have", searchQuery: "emergency mylar blankets" },
  { id: "sleeping-bag-compact", category: "Warmth & Shelter", name: "Compact Sleeping Bag", importance: "Good-to-have", searchQuery: "compact sleeping bag emergency" },
  // Tools & Repair
  { id: "multi-tool", category: "Tools & Repair", name: "Multi-Tool (Quality Brand)", importance: "Must-have", searchQuery: "leatherman multi-tool" },
  { id: "duct-tape", category: "Tools & Repair", name: "Heavy-Duty Duct Tape", importance: "Good-to-have", searchQuery: "heavy duty duct tape" },
  { id: "work-gloves", category: "Tools & Repair", name: "Work Gloves (Heavy Duty)", importance: "Good-to-have", searchQuery: "heavy duty work gloves" },
  // Documents & Cash
  { id: "document-pouch", category: "Documents & Cash", name: "Waterproof Document Pouch", importance: "Must-have", searchQuery: "waterproof document bag" },
  { id: "cash-organizer", category: "Documents & Cash", name: "Cash Envelope Organizer", importance: "Good-to-have", searchQuery: "cash envelope organizer" },
  // Mobility
  { id: "backpack-emergency", category: "Mobility", name: "Emergency Backpack (Durable)", importance: "Good-to-have", searchQuery: "emergency backpack durable" },
  // Pets & Baby
  { id: "pet-carrier", category: "Pets & Baby", name: "Pet Carrier (Collapsible)", importance: "Good-to-have", searchQuery: "pet carrier collapsible" },
];

const categories = [
  "All Products",
  "Water & Purification",
  "Power & Charging",
  "Lighting",
  "Communication",
  "First Aid & Medical",
  "Hygiene & Sanitation",
  "Cooking & Utilities",
  "Warmth & Shelter",
  "Tools & Repair",
  "Documents & Cash",
  "Mobility",
  "Pets & Baby",
];

const tldByMarket: Record<Market, string> = {
  NL: "amazon.nl",
  DE: "amazon.de",
  UK: "amazon.co.uk",
  US: "amazon.com",
};

export default function AdminAffiliates() {
  const [links, setLinks] = useState<AffiliateLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingMarket, setEditingMarket] = useState<Market>('US');
  const [saving, setSaving] = useState(false);

  // Form state
  const [affiliateTag, setAffiliateTag] = useState('');
  const [baseUrl, setBaseUrl] = useState('');

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Products');
  const [selectedMarket, setSelectedMarket] = useState<Market>('US');

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

  // Get link for a product and market
  const getLinkForProduct = (productId: string, market: Market): AffiliateLink | undefined => {
    return links.find(l => l.product_id === productId && l.market === market);
  };

  // Filter products
  const filteredProducts = useMemo(() => {
    let products = [...productCatalog];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      products = products.filter(
        p => p.name.toLowerCase().includes(query) || p.category.toLowerCase().includes(query)
      );
    }

    if (selectedCategory !== 'All Products') {
      products = products.filter(p => p.category === selectedCategory);
    }

    return products;
  }, [searchQuery, selectedCategory]);

  // Stats
  const configuredCount = useMemo(() => {
    const productIds = new Set(links.map(l => l.product_id));
    return productIds.size;
  }, [links]);

  const openEditDialog = (product: Product, market: Market) => {
    const existingLink = getLinkForProduct(product.id, market);
    setEditingProduct(product);
    setEditingMarket(market);
    setAffiliateTag(existingLink?.affiliate_tag || '');
    setBaseUrl(existingLink?.base_url || '');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingProduct) return;

    if (!affiliateTag.trim()) {
      toast.error('Affiliate tag is required');
      return;
    }

    setSaving(true);
    try {
      const existingLink = getLinkForProduct(editingProduct.id, editingMarket);

      if (existingLink) {
        const { error } = await supabase
          .from('affiliate_links')
          .update({
            affiliate_tag: affiliateTag.trim(),
            base_url: baseUrl.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingLink.id);

        if (error) throw error;
        toast.success('Affiliate link updated');
      } else {
        const { error } = await supabase.from('affiliate_links').insert({
          product_id: editingProduct.id,
          market: editingMarket,
          affiliate_tag: affiliateTag.trim(),
          base_url: baseUrl.trim() || null,
        });

        if (error) throw error;
        toast.success('Affiliate link created');
      }

      await fetchLinks();
      setDialogOpen(false);
    } catch (error: any) {
      console.error('Error saving affiliate link:', error);
      if (error.code === '23505') {
        toast.error('A link for this product/market combination already exists');
      } else {
        toast.error('Failed to save affiliate link');
      }
    }
    setSaving(false);
  };

  const handleDelete = async (product: Product, market: Market) => {
    const existingLink = getLinkForProduct(product.id, market);
    if (!existingLink) return;

    try {
      const { error } = await supabase.from('affiliate_links').delete().eq('id', existingLink.id);
      if (error) throw error;
      toast.success('Affiliate link removed');
      fetchLinks();
    } catch (error) {
      console.error('Error deleting affiliate link:', error);
      toast.error('Failed to delete affiliate link');
    }
  };

  // Preview URL
  const getPreviewUrl = (product: Product, market: Market, link?: AffiliateLink) => {
    const tld = tldByMarket[market];
    if (link?.base_url) {
      const separator = link.base_url.includes('?') ? '&' : '?';
      return `${link.base_url}${separator}tag=${link.affiliate_tag}`;
    }
    const encodedQuery = encodeURIComponent(product.searchQuery);
    const tag = link?.affiliate_tag || 'YOURTAG';
    return `https://www.${tld}/s?k=${encodedQuery}&tag=${tag}`;
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
      <div className="space-y-6">
        {/* Stats Card */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{productCatalog.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Configured Links
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{links.length}</div>
              <p className="text-xs text-muted-foreground">
                {configuredCount} products with at least 1 market
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Coverage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round((configuredCount / productCatalog.length) * 100)}%
              </div>
              <p className="text-xs text-muted-foreground">
                {productCatalog.length - configuredCount} products missing links
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Product Catalog</CardTitle>
            <CardDescription>
              Configure affiliate links for each product. Links are used in /products and /tools/supplies pages.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Market Tabs */}
            <Tabs value={selectedMarket} onValueChange={(v) => setSelectedMarket(v as Market)}>
              <TabsList className="mb-4">
                {MARKETS.map((market) => (
                  <TabsTrigger key={market} value={market} className="gap-2">
                    {market === 'US' && '🇺🇸'}
                    {market === 'UK' && '🇬🇧'}
                    {market === 'DE' && '🇩🇪'}
                    {market === 'NL' && '🇳🇱'}
                    {market}
                  </TabsTrigger>
                ))}
              </TabsList>

              {MARKETS.map((market) => (
                <TabsContent key={market} value={market}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[300px]">Product</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Affiliate Tag</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.map((product) => {
                        const link = getLinkForProduct(product.id, market);
                        const hasLink = !!link;

                        return (
                          <TableRow key={product.id}>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">{product.name}</span>
                                <span className="text-xs text-muted-foreground font-mono">
                                  {product.id}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {product.category}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {hasLink ? (
                                <Badge variant="default" className="bg-green-600 gap-1">
                                  <Check className="h-3 w-3" />
                                  Configured
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="gap-1 text-muted-foreground">
                                  <AlertCircle className="h-3 w-3" />
                                  Not configured
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {link ? (
                                <span className="font-mono text-sm">{link.affiliate_tag}</span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right space-x-2">
                              {link && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => window.open(getPreviewUrl(product, market, link), '_blank')}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditDialog(product, market)}
                              >
                                {hasLink ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                              </Button>
                              {hasLink && (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDelete(product, market)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {filteredProducts.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            No products found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {getLinkForProduct(editingProduct?.id || '', editingMarket) 
                ? 'Edit Affiliate Link' 
                : 'Add Affiliate Link'}
            </DialogTitle>
            <DialogDescription>
              Configure the affiliate link for {editingProduct?.name} in {editingMarket} market.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">{editingProduct?.name}</p>
              <p className="text-xs text-muted-foreground font-mono">{editingProduct?.id}</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="affiliateTag">Affiliate Tag *</Label>
              <Input
                id="affiliateTag"
                placeholder="e.g., mysite-20"
                value={affiliateTag}
                onChange={(e) => setAffiliateTag(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Your Amazon Associates tag for the {editingMarket} market
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="baseUrl">Direct Product URL (optional)</Label>
              <Input
                id="baseUrl"
                placeholder="https://amazon.com/dp/BXXXXXX"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to use search query: "{editingProduct?.searchQuery}"
              </p>
            </div>

            {affiliateTag && (
              <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                <p className="text-xs font-medium">Preview URL:</p>
                <p className="text-xs text-muted-foreground break-all font-mono">
                  {editingProduct && getPreviewUrl(editingProduct, editingMarket, {
                    affiliate_tag: affiliateTag,
                    base_url: baseUrl || null,
                  } as AffiliateLink)}
                </p>
              </div>
            )}
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

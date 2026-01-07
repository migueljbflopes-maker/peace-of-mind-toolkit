import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, Eye, Users, MapPin, Package, Heart, File, CheckCircle2 } from 'lucide-react';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useLocale } from '@/i18n/useLocale';
import { PremiumLockedState } from '@/components/PremiumLockedState';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function RedFolder() {
  const { isPremium, loading } = useEntitlements();
  const { t } = useLocale();

  const includesList = [
    { icon: Users, label: t.redFolder.includesList.contacts },
    { icon: MapPin, label: t.redFolder.includesList.plans },
    { icon: Package, label: t.redFolder.includesList.supplies },
    { icon: Heart, label: t.redFolder.includesList.medical },
    { icon: File, label: t.redFolder.includesList.documents },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">{t.common.loading}</div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-1">
        {!isPremium ? (
          <PremiumLockedState title={t.redFolder.title} />
        ) : (
          <div className="container-wide section-padding py-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-red-100">
                  <FileText className="h-5 w-5 text-red-600" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">{t.redFolder.title}</h1>
              </div>
              <p className="text-muted-foreground">{t.redFolder.subtitle}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl">
              {/* Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full gap-2" size="lg">
                    <Download className="h-4 w-4" />
                    {t.redFolder.generatePdf}
                  </Button>
                  <Button variant="outline" className="w-full gap-2">
                    <Eye className="h-4 w-4" />
                    {t.redFolder.preview}
                  </Button>
                </CardContent>
              </Card>

              {/* What's Included */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t.redFolder.includes}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {includesList.map((item, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="text-sm">{item.label}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Preview Placeholder */}
            <Card className="mt-8 max-w-4xl">
              <CardContent className="py-16 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                  <FileText className="h-8 w-8 text-red-600" />
                </div>
                <h3 className="text-lg font-medium mb-2">Red Folder Preview</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  {t.redFolder.comingNext}
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

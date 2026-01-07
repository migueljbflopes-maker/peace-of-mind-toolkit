import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Archive, Upload, Download, Shield, Clock } from 'lucide-react';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useLocale } from '@/i18n/useLocale';
import { PremiumLockedState } from '@/components/PremiumLockedState';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function Backup() {
  const { isPremium, loading } = useEntitlements();
  const { t } = useLocale();

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
          <PremiumLockedState title={t.backup.title} />
        ) : (
          <div className="container-wide section-padding py-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Archive className="h-5 w-5 text-primary" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">{t.backup.title}</h1>
              </div>
              <p className="text-muted-foreground">{t.backup.subtitle}</p>
            </div>

            <div className="max-w-2xl space-y-6">
              {/* Actions */}
              <Card>
                <CardContent className="py-6 space-y-4">
                  <Button className="w-full gap-2" size="lg">
                    <Upload className="h-4 w-4" />
                    {t.backup.backupNow}
                  </Button>
                  <Button variant="outline" className="w-full gap-2">
                    <Download className="h-4 w-4" />
                    {t.backup.restore}
                  </Button>
                </CardContent>
              </Card>

              {/* Last Backup Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {t.backup.lastBackup}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{t.backup.never}</p>
                </CardContent>
              </Card>

              {/* Security Note */}
              <Card className="bg-muted/50">
                <CardContent className="py-6">
                  <div className="flex gap-4">
                    <div className="p-2 rounded-lg bg-primary/10 h-fit">
                      <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium mb-1">End-to-End Encryption</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        {t.backup.explanation}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t.backup.ciphertextNote}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Coming Next */}
              <p className="text-sm text-muted-foreground text-center">
                {t.backup.comingNext}
              </p>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

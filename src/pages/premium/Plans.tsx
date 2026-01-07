import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, MapPin, Home, Sparkles, Edit } from 'lucide-react';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useLocale } from '@/i18n/useLocale';
import { PremiumLockedState } from '@/components/PremiumLockedState';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function Plans() {
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
          <PremiumLockedState title={t.plans.title} />
        ) : (
          <div className="container-wide section-padding py-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">{t.plans.title}</h1>
              </div>
              <p className="text-muted-foreground">{t.plans.subtitle}</p>
            </div>

            {/* Plans Grid */}
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
              {/* Plan A */}
              <Card className="border-2 border-dashed border-primary/30">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{t.plans.planA}</CardTitle>
                      <CardDescription>{t.plans.planADesc}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full gap-2">
                    <Sparkles className="h-4 w-4" />
                    {t.plans.generateDraft}
                  </Button>
                  <Button variant="ghost" className="w-full gap-2">
                    <Edit className="h-4 w-4" />
                    {t.plans.editDetails}
                  </Button>
                </CardContent>
              </Card>

              {/* Plan B */}
              <Card className="border-2 border-dashed border-orange-300/50">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-100">
                      <Home className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{t.plans.planB}</CardTitle>
                      <CardDescription>{t.plans.planBDesc}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full gap-2">
                    <Sparkles className="h-4 w-4" />
                    {t.plans.generateDraft}
                  </Button>
                  <Button variant="ghost" className="w-full gap-2">
                    <Edit className="h-4 w-4" />
                    {t.plans.editDetails}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Coming Next */}
            <p className="mt-8 text-sm text-muted-foreground text-center">
              {t.plans.comingNext}
            </p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

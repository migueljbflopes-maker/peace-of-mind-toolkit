import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, CreditCard, Users, Heart, Wallet, Smartphone } from 'lucide-react';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useLocale } from '@/i18n/useLocale';
import { PremiumLockedState } from '@/components/PremiumLockedState';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function Vault() {
  const { isPremium, loading } = useEntitlements();
  const { t } = useLocale();

  const sections = [
    { key: 'ids', icon: CreditCard, label: t.vault.sections.ids },
    { key: 'contacts', icon: Users, label: t.vault.sections.contacts },
    { key: 'medical', icon: Heart, label: t.vault.sections.medical },
    { key: 'finance', icon: Wallet, label: t.vault.sections.finance },
    { key: 'devices', icon: Smartphone, label: t.vault.sections.devices },
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
          <PremiumLockedState title={t.vault.title} />
        ) : (
          <div className="container-wide section-padding py-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Lock className="h-5 w-5 text-primary" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">{t.vault.title}</h1>
              </div>
              <p className="text-muted-foreground">{t.vault.subtitle}</p>
            </div>

            {/* Unlock Vault */}
            <Card className="mb-8 max-w-md">
              <CardHeader>
                <CardTitle className="text-base">{t.vault.unlockVault}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input 
                  type="password" 
                  placeholder={t.vault.passphrasePlaceholder}
                />
                <Button className="w-full">{t.vault.unlockVault}</Button>
              </CardContent>
            </Card>

            {/* Sections Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sections.map((section) => (
                <Card key={section.key} className="cursor-pointer hover:border-primary/50 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <section.icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <h3 className="font-medium">{section.label}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">{t.common.comingSoon}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Coming Next */}
            <p className="mt-8 text-sm text-muted-foreground text-center">
              {t.vault.comingNext}
            </p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

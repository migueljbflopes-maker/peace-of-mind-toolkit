import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Archive, Upload, Download, Shield, WifiOff, HelpCircle, 
  AlertTriangle, Loader2, Info, Smartphone, Cloud, Laptop, 
  Lock, ArrowRight, CheckCircle2 
} from 'lucide-react';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useLocale } from '@/i18n/useLocale';
import { useAuth } from '@/hooks/useAuth';
import { useVaultSession } from '@/hooks/useVaultSession';
import { PremiumLockedState } from '@/components/PremiumLockedState';
import { LoginGateCard } from '@/components/LoginGateCard';
import { VaultUnlockForm } from '@/components/vault/VaultUnlockForm';
import { 
  getLocalDataSummary, 
  getLatestBackupInfo, 
  createBackup, 
  restoreFromBackup,
  LocalDataSummary,
  BackupInfo 
} from '@/lib/backup';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { toast } from 'sonner';

// Onboarding card component shown before vault unlock for first-time users
function BackupOnboardingCard({ t, onContinue }: { t: any; onContinue: () => void }) {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card className="border-primary/20">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto p-3 rounded-full bg-primary/10 w-fit mb-3">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-xl">{t.backup.onboardingTitle}</CardTitle>
          <p className="text-muted-foreground text-sm mt-1">{t.backup.onboardingSubtitle}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Visual Flow Diagram */}
          <div className="flex items-center justify-center gap-2 sm:gap-4 py-6 px-4 bg-muted/30 rounded-lg">
            <div className="text-center">
              <div className="p-2 rounded-lg bg-background border mx-auto mb-2">
                <Smartphone className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              </div>
              <span className="text-xs text-muted-foreground hidden sm:block">{t.backup.yourDevice}</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Lock className="h-3 w-3 sm:h-4 sm:w-4" />
              <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
            </div>
            <div className="text-center">
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 mx-auto mb-2">
                <Cloud className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              </div>
              <span className="text-xs text-muted-foreground hidden sm:block">{t.backup.encryptedCloud}</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
              <Lock className="h-3 w-3 sm:h-4 sm:w-4" />
            </div>
            <div className="text-center">
              <div className="p-2 rounded-lg bg-background border mx-auto mb-2">
                <Laptop className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              </div>
              <span className="text-xs text-muted-foreground hidden sm:block">{t.backup.anyDevice}</span>
            </div>
          </div>

          {/* What gets backed up */}
          <div className="space-y-2">
            <h3 className="font-medium text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              {t.backup.whatGetsBackedUp}
            </h3>
            <ul className="text-sm text-muted-foreground space-y-1 ml-6">
              <li>• {t.backup.backupItem1}</li>
              <li>• {t.backup.backupItem2}</li>
            </ul>
          </div>

          {/* Security guarantees */}
          <div className="space-y-2">
            <h3 className="font-medium text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              {t.backup.securityGuarantees}
            </h3>
            <ul className="text-sm text-muted-foreground space-y-1 ml-6">
              <li>• {t.backup.securityItem1}</li>
              <li>• {t.backup.securityItem2}</li>
              <li>• {t.backup.securityItem3}</li>
            </ul>
          </div>

          {/* Important warning */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <h3 className="font-medium text-sm text-amber-800 flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4" />
              {t.backup.importantNote}
            </h3>
            <ul className="text-sm text-amber-700 space-y-1 ml-6">
              <li>• {t.backup.importantItem1}</li>
              <li>• {t.backup.importantItem2}</li>
            </ul>
          </div>

          {/* CTA */}
          <Button onClick={onContinue} className="w-full" size="lg">
            {t.backup.continueToBackup}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Backup() {
  const { user, loading: authLoading } = useAuth();
  const { isPremium, loading: entLoading } = useEntitlements();
  const { t, locale } = useLocale();
  const { isUnlocked } = useVaultSession();
  
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [localData, setLocalData] = useState<LocalDataSummary | null>(null);
  const [backupInfo, setBackupInfo] = useState<BackupInfo | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Track online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load data summary and backup info
  const loadData = useCallback(async () => {
    const summary = await getLocalDataSummary();
    setLocalData(summary);
    
    if (user && isOnline) {
      const info = await getLatestBackupInfo(user.id);
      setBackupInfo(info);
      
      // If user has existing backup, skip onboarding
      if (info) {
        setShowOnboarding(false);
      }
    }
    setDataLoaded(true);
  }, [user, isOnline]);

  useEffect(() => {
    if (isPremium && user) {
      loadData();
    }
  }, [isPremium, user, loadData]);

  // If vault is unlocked, hide onboarding
  useEffect(() => {
    if (isUnlocked) {
      setShowOnboarding(false);
    }
  }, [isUnlocked]);

  const handleBackup = async () => {
    if (!user || !isOnline) return;
    
    setIsBackingUp(true);
    try {
      const result = await createBackup(user.id);
      
      if (result.success) {
        toast.success(t.backup.backupSuccess);
        await loadData(); // Refresh backup info
      } else {
        if (result.error === 'No data to backup') {
          toast.error(t.backup.noDataToBackup);
        } else {
          toast.error(result.error || 'Backup failed');
        }
      }
    } catch {
      toast.error('Backup failed');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestore = async () => {
    if (!user || !isOnline) return;
    
    setIsRestoring(true);
    try {
      const result = await restoreFromBackup(user.id);
      
      if (result.success) {
        toast.success(t.backup.restoreSuccess);
        await loadData(); // Refresh local data summary
      } else {
        toast.error(result.error || 'Restore failed');
      }
    } catch {
      toast.error('Restore failed');
    } finally {
      setIsRestoring(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(locale === 'pt' ? 'pt-PT' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (authLoading || entLoading) {
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

  // Login check BEFORE premium check
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 container-wide section-padding py-8">
          <LoginGateCard feature={t.backup.title} />
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

            {/* Offline Banner */}
            {!isOnline && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3">
                <WifiOff className="h-5 w-5 text-amber-600" />
                <span className="text-sm text-amber-800">{t.backup.requiresInternet}</span>
              </div>
            )}

            {/* Show Onboarding for first-time visitors */}
            {showOnboarding && dataLoaded && !backupInfo ? (
              <BackupOnboardingCard t={t} onContinue={() => setShowOnboarding(false)} />
            ) : !isUnlocked ? (
              /* Vault Unlock Required */
              <div className="max-w-md mx-auto">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{t.vault.unlockVault}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      {t.vault.lockedExplainer}
                    </p>
                    <VaultUnlockForm onUnlock={() => loadData()} />
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="max-w-2xl space-y-6">
                {/* Backup Status Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      {t.backup.backupNow}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Last Backup Info */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t.backup.lastBackup}:</span>
                      <span className="font-medium">
                        {backupInfo ? formatDate(backupInfo.createdAt) : t.backup.never}
                      </span>
                    </div>

                    {/* Local Data Summary */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t.backup.localData}:</span>
                      <span className="font-medium">
                        {t.backup.vaultSections} {localData?.vaultSectionCount || 0}/5, {t.backup.plans} {localData?.planCount || 0}/2
                      </span>
                    </div>

                    {/* Backup Button */}
                    <Button 
                      className="w-full gap-2" 
                      size="lg"
                      onClick={handleBackup}
                      disabled={!isOnline || isBackingUp || (localData?.vaultSectionCount === 0 && localData?.planCount === 0)}
                    >
                      {isBackingUp ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {t.backup.backingUp}
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          {t.backup.backupNow}
                        </>
                      )}
                    </Button>
                    
                    {!isOnline && (
                      <p className="text-xs text-muted-foreground text-center">
                        {t.backup.requiresInternet}
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Restore Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      {t.backup.restore}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Latest Backup Available */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t.backup.latestBackup}:</span>
                      <span className="font-medium">
                        {backupInfo ? formatDate(backupInfo.createdAt) : t.backup.noBackup}
                      </span>
                    </div>

                    {/* Warning */}
                    {backupInfo && (
                      <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-amber-800">{t.backup.restoreWarning}</p>
                      </div>
                    )}

                    {/* Restore Button */}
                    <Button 
                      variant="outline"
                      className="w-full gap-2"
                      onClick={handleRestore}
                      disabled={!isOnline || isRestoring || !backupInfo}
                    >
                      {isRestoring ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {t.backup.restoring}
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4" />
                          {t.backup.restore}
                        </>
                      )}
                    </Button>

                    {!isOnline && (
                      <p className="text-xs text-muted-foreground text-center">
                        {t.backup.restoreRequiresInternet}
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* How It Works Dialog */}
                <div className="text-center">
                  <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                        <HelpCircle className="h-4 w-4" />
                        {t.backup.learnHow}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Shield className="h-5 w-5 text-primary" />
                          {t.backup.howItWorks}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-3 text-sm text-muted-foreground">
                        <div className="flex gap-3">
                          <span className="font-medium text-foreground">1.</span>
                          <p>{t.backup.howStep1}</p>
                        </div>
                        <div className="flex gap-3">
                          <span className="font-medium text-foreground">2.</span>
                          <p>{t.backup.howStep2}</p>
                        </div>
                        <div className="flex gap-3">
                          <span className="font-medium text-foreground">3.</span>
                          <p>{t.backup.howStep3}</p>
                        </div>
                        <div className="flex gap-3">
                          <span className="font-medium text-foreground">4.</span>
                          <p>{t.backup.howStep4}</p>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

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

                {/* Safety Note */}
                <div className="flex items-start gap-2 p-4 bg-muted/50 rounded-lg">
                  <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    {t.backup.safetyNote}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

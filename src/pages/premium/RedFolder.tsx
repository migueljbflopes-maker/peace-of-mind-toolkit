import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, Eye, Loader2, CheckCircle2, WifiOff, Info } from 'lucide-react';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useLocale } from '@/i18n/useLocale';
import { useVaultSession } from '@/hooks/useVaultSession';
import { useRedFolderData, DataReadiness } from '@/hooks/useRedFolderData';
import { PremiumLockedState } from '@/components/PremiumLockedState';
import { LoginGateCard } from '@/components/LoginGateCard';
import { VaultUnlockForm } from '@/components/vault/VaultUnlockForm';
import { DataReadinessPanel } from '@/components/redFolder/DataReadinessPanel';
import { buildRedFolderPdf } from '@/lib/pdf/redFolderPdf';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export default function RedFolder() {
  const { user, loading: authLoading } = useAuth();
  const { isPremium, loading: entLoading } = useEntitlements();
  const { t, locale } = useLocale();
  const { isUnlocked } = useVaultSession();
  const { isLoading: isLoadingData, readiness, checkReadiness, loadAllData } = useRedFolderData();
  
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

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

  // Check data readiness when vault is unlocked
  useEffect(() => {
    if (isUnlocked && isPremium) {
      checkReadiness();
    }
  }, [isUnlocked, isPremium, checkReadiness]);

  // Cleanup object URL on unmount
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const handleGeneratePdf = async () => {
    setIsGenerating(true);
    try {
      const data = await loadAllData();
      if (!data) {
        toast.error('Failed to load data for PDF');
        return;
      }

      const blob = await buildRedFolderPdf(data);
      setPdfBlob(blob);
      
      // Create object URL for download
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);

      // Log export metadata (no PDF content)
      if (user) {
        await supabase.from('exports').insert([{
          user_id: user.id,
          export_type: 'red_folder_pdf',
          locale,
        }]);
      }

      toast.success(t.redFolder.pdfReady);
    } catch (error) {
      toast.error('Failed to generate PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!pdfUrl) return;
    
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `resiliency-plan-${locale}-${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRegenerate = () => {
    setPdfBlob(null);
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
    handleGeneratePdf();
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
          <LoginGateCard feature={t.redFolder.title} />
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

            {/* Offline Banner */}
            {!isOnline && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3">
                <WifiOff className="h-5 w-5 text-amber-600" />
                <span className="text-sm text-amber-800">{t.redFolder.offlineBanner}</span>
              </div>
            )}

            {/* Vault Unlock Required */}
            {!isUnlocked ? (
              <div className="max-w-md mx-auto">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{t.vault.unlockVault}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      {t.vault.lockedExplainer}
                    </p>
                    <VaultUnlockForm onUnlock={() => checkReadiness()} />
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-8 max-w-4xl">
                {/* Data Readiness Panel */}
                <DataReadinessPanel readiness={readiness} />

                {/* Actions Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      {pdfBlob ? t.redFolder.pdfReady : 'Actions'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {pdfBlob ? (
                      <>
                        {/* Success State */}
                        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                          <span className="text-sm text-green-800">{t.redFolder.pdfReadyDesc}</span>
                        </div>
                        
                        <Button 
                          className="w-full gap-2" 
                          size="lg"
                          onClick={handleDownload}
                        >
                          <Download className="h-4 w-4" />
                          {t.redFolder.downloadPdf}
                        </Button>
                        
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={handleRegenerate}
                          disabled={isGenerating}
                        >
                          {isGenerating ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              {t.redFolder.generating}
                            </>
                          ) : (
                            t.redFolder.regenerate
                          )}
                        </Button>
                      </>
                    ) : (
                      <>
                        {/* Initial State */}
                        <Button 
                          className="w-full gap-2" 
                          size="lg"
                          onClick={handleGeneratePdf}
                          disabled={isGenerating || isLoadingData}
                        >
                          {isGenerating ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              {t.redFolder.generating}
                            </>
                          ) : (
                            <>
                              <Download className="h-4 w-4" />
                              {t.redFolder.generatePdf}
                            </>
                          )}
                        </Button>

                        <Button 
                          variant="outline" 
                          className="w-full gap-2"
                          onClick={() => checkReadiness()}
                        >
                          <Eye className="h-4 w-4" />
                          {t.redFolder.preview}
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Premium Note */}
            {isUnlocked && (
              <div className="mt-8 max-w-4xl">
                <div className="flex items-start gap-2 p-4 bg-muted/50 rounded-lg">
                  <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    {t.redFolder.premiumNote}
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

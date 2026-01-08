import { useState, useCallback, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, Info, WifiOff, Sparkles } from 'lucide-react';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useLocale } from '@/i18n/useLocale';
import { useVaultSession } from '@/hooks/useVaultSession';
import { usePlansSync } from '@/hooks/usePlansSync';
import { PremiumLockedState } from '@/components/PremiumLockedState';
import { LoginGateCard } from '@/components/LoginGateCard';
import { VaultUnlockForm } from '@/components/vault/VaultUnlockForm';
import { PlanCard } from '@/components/plans/PlanCard';
import { PlanEditor } from '@/components/plans/PlanEditor';
import { PlanContextWizard } from '@/components/plans/PlanContextWizard';
import { PlanData, PlanType } from '@/lib/plansStore';
import { generatePlanDraft, AIPlanInput } from '@/lib/aiPlanDraft';
import { encryptJSON, decryptJSON, EncryptedPayload } from '@/lib/crypto';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function Plans() {
  const { user, loading: authLoading } = useAuth();
  const { isPremium, loading: entLoading } = useEntitlements();
  const { t, locale } = useLocale();
  const { isUnlocked, getPassphrase } = useVaultSession();
  const { 
    isOnline, 
    planStatuses, 
    savePlan, 
    getPlan,
    sync,
    refresh 
  } = usePlansSync();

  const [editingPlan, setEditingPlan] = useState<PlanType | null>(null);
  const [editingData, setEditingData] = useState<PlanData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState<PlanType | null>(null);
  const [showContextWizard, setShowContextWizard] = useState<PlanType | null>(null);

  // Sync on mount
  useEffect(() => {
    if (isPremium && isUnlocked && isOnline) {
      sync();
    }
  }, [isPremium, isUnlocked, isOnline, sync]);

  // Load and decrypt plan for editing
  const handleEditPlan = useCallback(async (planType: PlanType) => {
    const passphrase = getPassphrase();
    if (!passphrase) return;

    try {
      const cached = await getPlan(planType);
      if (cached) {
        const payload: EncryptedPayload = {
          ciphertextB64: cached.ciphertextB64,
          ivB64: cached.ivB64,
          saltB64: cached.saltB64,
          version: cached.version,
        };
        const decrypted = await decryptJSON<PlanData>(payload, passphrase);
        setEditingData(decrypted);
      } else {
        setEditingData(null);
      }
      setEditingPlan(planType);
    } catch {
      toast.error(t.vault.wrongPassphrase);
    }
  }, [getPlan, getPassphrase, t]);

  // Save plan (encrypt + store)
  const handleSavePlan = useCallback(async (data: PlanData) => {
    const passphrase = getPassphrase();
    if (!passphrase) return;

    setIsSaving(true);
    try {
      const encrypted = await encryptJSON(data, passphrase);
      const result = await savePlan(data.meta.planType, encrypted);
      
      if (result.synced) {
        toast.success(t.plans.syncedToCloud);
      } else {
        toast.success(t.plans.savedLocally);
      }
      
      setEditingPlan(null);
      setEditingData(null);
      await refresh();
    } catch {
      toast.error('Failed to save plan');
    } finally {
      setIsSaving(false);
    }
  }, [getPassphrase, savePlan, refresh, t]);

  // Start context wizard before generating draft
  const handleStartGenerateDraft = useCallback((planType: PlanType) => {
    setShowContextWizard(planType);
  }, []);

  // Generate AI draft with collected context
  const handleGenerateDraft = useCallback(async (context: AIPlanInput) => {
    const passphrase = getPassphrase();
    if (!passphrase || !user || !showContextWizard) return;

    const planType = showContextWizard;
    setIsGenerating(planType);
    
    try {
      // Generate draft via Edge Function with rich context
      const { plan, usedAI } = await generatePlanDraft(planType, context, user.id);

      if (usedAI) {
        toast.success(t.plans.draftGenerated);
      } else {
        toast.success(t.plans.draftGenerated + ' (offline template)');
      }
      
      // Close wizard and open editor with draft
      setShowContextWizard(null);
      setEditingData(plan);
      setEditingPlan(planType);
    } catch {
      toast.error('Failed to generate draft');
    } finally {
      setIsGenerating(null);
    }
  }, [getPassphrase, user, showContextWizard, t]);

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
          <LoginGateCard feature={t.plans.title} />
        </main>
        <Footer />
      </div>
    );
  }

  // Show context wizard if collecting context
  if (showContextWizard) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 container-wide section-padding py-8">
          <PlanContextWizard
            planType={showContextWizard}
            onComplete={handleGenerateDraft}
            onCancel={() => setShowContextWizard(null)}
            isGenerating={isGenerating === showContextWizard}
          />
        </main>
        <Footer />
      </div>
    );
  }

  // Show editor if editing
  if (editingPlan) {
    return (
      <PlanEditor
        planType={editingPlan}
        initialData={editingData}
        onSave={handleSavePlan}
        onCancel={() => { setEditingPlan(null); setEditingData(null); }}
        isSaving={isSaving}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-1">
        {!isPremium ? (
          <PremiumLockedState title={t.plans.title} />
        ) : !isUnlocked ? (
          <div className="container-wide section-padding py-8">
            <VaultUnlockForm onUnlock={() => refresh()} />
          </div>
        ) : (
          <div className="container-wide section-padding py-8">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">{t.plans.title}</h1>
              </div>
              <p className="text-muted-foreground">{t.plans.subtitle}</p>
            </div>

            {/* Offline banner */}
            {!isOnline && (
              <Alert className="mb-6 border-amber-200 bg-amber-50">
                <WifiOff className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  {t.vault.sync.offlineBanner}
                </AlertDescription>
              </Alert>
            )}

            {/* Tip */}
            <Alert className="mb-6 border-primary/20 bg-primary/5">
              <Info className="h-4 w-4 text-primary" />
              <AlertDescription className="text-foreground">
                {t.plans.tip}
              </AlertDescription>
            </Alert>

            {/* Plans Grid */}
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
              {(['A', 'B'] as PlanType[]).map((planType) => {
                const status = planStatuses.find(s => s.planType === planType) || {
                  planType,
                  hasData: false,
                  updatedAt: null,
                  isSynced: true,
                  status: 'not_started' as const,
                };
                return (
                  <PlanCard
                    key={planType}
                    planType={planType}
                    status={status}
                    onEdit={handleEditPlan}
                    onGenerateDraft={handleStartGenerateDraft}
                    isGenerating={isGenerating === planType}
                  />
                );
              })}
            </div>

            {/* Premium note */}
            <p className="mt-8 text-sm text-muted-foreground text-center flex items-center justify-center gap-2">
              <Sparkles className="h-4 w-4" />
              {t.plans.premiumNote}
            </p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
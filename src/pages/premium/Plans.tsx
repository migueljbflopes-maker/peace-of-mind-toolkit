import { useState, useCallback, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, Info, WifiOff, Sparkles } from 'lucide-react';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useLocale } from '@/i18n/useLocale';
import { useVaultSession } from '@/hooks/useVaultSession';
import { usePlansSync } from '@/hooks/usePlansSync';
import { PremiumLockedState } from '@/components/PremiumLockedState';
import { VaultUnlockForm } from '@/components/vault/VaultUnlockForm';
import { PlanCard } from '@/components/plans/PlanCard';
import { PlanEditor } from '@/components/plans/PlanEditor';
import { PlanData, PlanType } from '@/lib/plansStore';
import { generatePlanDraft, AIPlanInput, createAIJobInputSummary } from '@/lib/aiPlanDraft';
import { encryptJSON, decryptJSON, EncryptedPayload } from '@/lib/crypto';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function Plans() {
  const { isPremium, loading } = useEntitlements();
  const { t, locale } = useLocale();
  const { isUnlocked, getPassphrase } = useVaultSession();
  const { user } = useAuth();
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

  // Generate AI draft
  const handleGenerateDraft = useCallback(async (planType: PlanType) => {
    const passphrase = getPassphrase();
    if (!passphrase) return;

    setIsGenerating(planType);
    try {
      // Non-sensitive input for AI
      const input: AIPlanInput = {
        locale,
        region: 'general',
        riskLevelBand: 'medium',
        householdSizeBucket: '2-3',
        hasPets: false,
        hasKids: false,
        mobilityLevel: 'high',
        daysPreparedness: 14,
      };

      // Generate draft
      const draft = await generatePlanDraft(planType, input);

      // Log AI job (non-sensitive only)
      if (user) {
        await supabase.from('ai_jobs').insert({
          user_id: user.id,
          job_type: `plan_${planType.toLowerCase()}_draft`,
          status: 'done',
          input_summary: createAIJobInputSummary(input),
          output: draft,
        });
      }

      toast.success(t.plans.draftGenerated);
      
      // Open editor with draft
      setEditingData(draft);
      setEditingPlan(planType);
    } catch {
      toast.error('Failed to generate draft');
    } finally {
      setIsGenerating(null);
    }
  }, [getPassphrase, locale, user, t]);

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
                    onGenerateDraft={handleGenerateDraft}
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

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { hasGeneratedPlans } from '@/lib/planWizard2Store';
import { getAllCachedSections } from '@/lib/vaultStorage';

export interface JourneyStep {
  id: string;
  phase: 'assess' | 'prepare' | 'secure' | 'activate';
  phaseLabel: string;
  label: string;
  description: string;
  href: string;
  isPremium: boolean;
  isComplete: boolean;
  isLocked: boolean;
  isCurrent: boolean;
  lockReason?: string;
  warning?: string;
}

export interface PreparednessJourney {
  loading: boolean;
  steps: JourneyStep[];
  currentStep: JourneyStep | null;
  completedCount: number;
  totalCount: number;
  progressPercent: number;
}

const STEP_DEFINITIONS = [
  {
    id: 'risk-assessment',
    phase: 'assess' as const,
    phaseLabel: 'Assess',
    label: 'Risk Assessment',
    description: 'Understand your location-specific risks',
    href: '/tools/risk',
    isPremium: false,
  },
  {
    id: 'risk-insights',
    phase: 'assess' as const,
    phaseLabel: 'Assess',
    label: 'AI Risk Insights',
    description: 'Get personalized AI-powered analysis',
    href: '/premium/risk',
    isPremium: true,
  },
  {
    id: 'supplies-plan',
    phase: 'prepare' as const,
    phaseLabel: 'Prepare',
    label: 'Supplies Plan',
    description: 'Build your emergency supplies checklist',
    href: '/tools/supplies',
    isPremium: false,
  },
  {
    id: 'plan-ab',
    phase: 'prepare' as const,
    phaseLabel: 'Prepare',
    label: 'Plan A & Plan B',
    description: 'Create shelter and evacuation plans',
    href: '/premium/plans',
    isPremium: true,
  },
  {
    id: 'vault-setup',
    phase: 'secure' as const,
    phaseLabel: 'Secure',
    label: 'Vault Setup',
    description: 'Store critical documents securely',
    href: '/premium/vault',
    isPremium: true,
  },
  {
    id: 'backup',
    phase: 'secure' as const,
    phaseLabel: 'Secure',
    label: 'Enable Backup',
    description: 'Encrypt and backup your data',
    href: '/premium/backup',
    isPremium: true,
  },
  {
    id: 'red-folder',
    phase: 'secure' as const,
    phaseLabel: 'Secure',
    label: 'Red Folder Export',
    description: 'Generate your emergency PDF',
    href: '/premium/red-folder',
    isPremium: true,
  },
  {
    id: 'panic-contacts',
    phase: 'activate' as const,
    phaseLabel: 'Activate',
    label: 'Panic Contacts',
    description: 'Set up your emergency contacts',
    href: '/panic/setup',
    isPremium: true,
  },
  {
    id: 'panic-test',
    phase: 'activate' as const,
    phaseLabel: 'Activate',
    label: 'Test Panic Button',
    description: 'Verify your emergency system works',
    href: '/panic/test',
    isPremium: true,
  },
];

interface CompletionStatus {
  riskAssessment: boolean;
  riskInsights: boolean;
  suppliesPlan: boolean;
  planAB: boolean;
  vault: boolean;
  backup: boolean;
  redFolder: boolean;
  panicContacts: boolean;
  panicTest: boolean;
}

export function usePreparednessJourney(
  userId: string | undefined,
  isPremium: boolean
): PreparednessJourney {
  const [loading, setLoading] = useState(true);
  const [completion, setCompletion] = useState<CompletionStatus>({
    riskAssessment: false,
    riskInsights: false,
    suppliesPlan: false,
    planAB: false,
    vault: false,
    backup: false,
    redFolder: false,
    panicContacts: false,
    panicTest: false,
  });

  const fetchCompletionStatus = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Batch all queries in parallel
      const [
        riskRes,
        riskWithInsightsRes,
        suppliesRes,
        plansStatus,
        vaultSections,
        backupsRes,
        exportsRes,
        contactsRes,
        testsRes,
      ] = await Promise.all([
        supabase
          .from('risk_assessments')
          .select('id')
          .eq('user_id', userId)
          .limit(1),
        supabase
          .from('risk_assessments')
          .select('id, ai_insights')
          .eq('user_id', userId)
          .not('ai_insights', 'is', null)
          .limit(1),
        supabase
          .from('supplies_plans')
          .select('id')
          .eq('user_id', userId)
          .limit(1),
        hasGeneratedPlans(userId),
        getAllCachedSections().catch(() => []),
        supabase
          .from('backups')
          .select('id')
          .eq('user_id', userId)
          .limit(1),
        supabase
          .from('exports')
          .select('id')
          .eq('user_id', userId)
          .eq('export_type', 'red_folder_pdf')
          .limit(1),
        supabase
          .from('panic_contacts')
          .select('id')
          .eq('user_id', userId)
          .limit(1),
        supabase
          .from('panic_activations')
          .select('id')
          .eq('user_id', userId)
          .eq('is_test', true)
          .limit(1),
      ]);

      // Filter vault sections that have actual data
      const vaultWithData = vaultSections.filter(
        (s) => s.payload && s.payload.ciphertext
      );

      setCompletion({
        riskAssessment: (riskRes.data?.length ?? 0) > 0,
        riskInsights: (riskWithInsightsRes.data?.length ?? 0) > 0,
        suppliesPlan: (suppliesRes.data?.length ?? 0) > 0,
        planAB: plansStatus.hasPlanA && plansStatus.hasPlanB,
        vault: vaultWithData.length > 0,
        backup: (backupsRes.data?.length ?? 0) > 0,
        redFolder: (exportsRes.data?.length ?? 0) > 0,
        panicContacts: (contactsRes.data?.length ?? 0) > 0,
        panicTest: (testsRes.data?.length ?? 0) > 0,
      });
    } catch (error) {
      console.error('Error fetching journey completion status:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchCompletionStatus();
  }, [fetchCompletionStatus]);

  // Build steps with completion, locks, and warnings
  const steps: JourneyStep[] = STEP_DEFINITIONS.map((def) => {
    let isComplete = false;
    let isLocked = false;
    let lockReason: string | undefined;
    let warning: string | undefined;

    // Determine completion status
    switch (def.id) {
      case 'risk-assessment':
        isComplete = completion.riskAssessment;
        break;
      case 'risk-insights':
        isComplete = completion.riskInsights;
        // Soft warning if basic risk assessment not done
        if (!completion.riskAssessment && !isComplete) {
          warning = 'Recommended: complete Risk Assessment first';
        }
        break;
      case 'supplies-plan':
        isComplete = completion.suppliesPlan;
        break;
      case 'plan-ab':
        isComplete = completion.planAB;
        // Soft warning if risk assessment not done
        if (!completion.riskAssessment && !isComplete) {
          warning = 'Recommended: complete Risk Assessment first';
        }
        break;
      case 'vault-setup':
        isComplete = completion.vault;
        break;
      case 'backup':
        isComplete = completion.backup;
        // Hard lock if vault not set up
        if (!completion.vault) {
          isLocked = true;
          lockReason = 'Set up your Vault first';
        }
        break;
      case 'red-folder':
        isComplete = completion.redFolder;
        // Soft warning if neither vault nor plans exist
        if (!completion.vault && !completion.planAB && !isComplete) {
          warning = 'Recommended: set up Vault or Plans first';
        }
        break;
      case 'panic-contacts':
        isComplete = completion.panicContacts;
        break;
      case 'panic-test':
        isComplete = completion.panicTest;
        // Hard lock if panic contacts not set up
        if (!completion.panicContacts) {
          isLocked = true;
          lockReason = 'Set up your Panic Contacts first';
        }
        break;
    }

    return {
      ...def,
      isComplete,
      isLocked,
      isCurrent: false, // Will be set below
      lockReason,
      warning,
    };
  });

  // Determine current step (first that is not complete and not locked)
  let currentStep: JourneyStep | null = null;
  for (const step of steps) {
    if (!step.isComplete && !step.isLocked) {
      step.isCurrent = true;
      currentStep = step;
      break;
    }
  }

  const completedCount = steps.filter((s) => s.isComplete).length;
  const totalCount = steps.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  return {
    loading,
    steps,
    currentStep,
    completedCount,
    totalCount,
    progressPercent,
  };
}

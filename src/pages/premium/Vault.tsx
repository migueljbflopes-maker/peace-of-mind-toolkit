import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Lock, WifiOff, Clock, ArrowLeft, Settings } from 'lucide-react';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/i18n/useLocale';
import { PremiumLockedState } from '@/components/PremiumLockedState';
import { LoginGateCard } from '@/components/LoginGateCard';
import { VaultUnlockForm } from '@/components/vault/VaultUnlockForm';
import { VaultSectionCard } from '@/components/vault/VaultSectionCard';
import { VaultSyncStatus } from '@/components/vault/VaultSyncStatus';
import { VaultSectionEditor, VaultSectionData } from '@/components/vault/VaultSectionEditor';
import { VaultWizard } from '@/components/vault/VaultWizard';
import { StorageModeSelector } from '@/components/vault/StorageModeSelector';
import { useVaultSession } from '@/hooks/useVaultSession';
import { useVaultSync, VaultSection, VAULT_SECTIONS } from '@/hooks/useVaultSync';
import { encryptJSON, decryptJSON, EncryptedPayload } from '@/lib/crypto';
import { getStorageMode, setStorageMode, VaultStorageMode } from '@/lib/vaultPreferences';
import { toast } from 'sonner';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function Vault() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isPremium, loading: entLoading } = useEntitlements();
  const { t } = useLocale();
  const { isUnlocked, lock, getPassphrase, recordActivity, timeUntilLock } = useVaultSession();
  const { 
    isOnline, 
    isSyncing, 
    sectionStatuses, 
    hasUnsyncedChanges, 
    getSection, 
    saveSection, 
    sync,
    refresh 
  } = useVaultSync();

  const [editingSection, setEditingSection] = useState<VaultSection | null>(null);
  const [sectionData, setSectionData] = useState<VaultSectionData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingSection, setIsLoadingSection] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [currentStorageMode, setCurrentStorageMode] = useState<VaultStorageMode>(() => getStorageMode());

  // Check if user has any vault data (first-time detection)
  useEffect(() => {
    if (isUnlocked && sectionStatuses.length > 0) {
      const hasAnyData = sectionStatuses.some(s => s.hasData);
      setIsFirstTimeUser(!hasAnyData);
      setShowWizard(!hasAnyData);
    }
  }, [isUnlocked, sectionStatuses]);

  // Format time until lock
  const formatTimeUntilLock = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Record activity on user interaction
  useEffect(() => {
    if (!isUnlocked) return;
    
    const handleActivity = () => recordActivity();
    
    document.addEventListener('click', handleActivity);
    document.addEventListener('keydown', handleActivity);
    
    return () => {
      document.removeEventListener('click', handleActivity);
      document.removeEventListener('keydown', handleActivity);
    };
  }, [isUnlocked, recordActivity]);

  // Load section data when editing
  const handleEditSection = useCallback(async (section: VaultSection) => {
    const passphrase = getPassphrase();
    if (!passphrase) return;

    setIsLoadingSection(true);
    try {
      const cached = await getSection(section);
      
      if (cached) {
        const payload: EncryptedPayload = {
          ciphertextB64: cached.ciphertextB64,
          ivB64: cached.ivB64,
          saltB64: cached.saltB64,
          version: cached.version,
        };
        const decrypted = await decryptJSON<VaultSectionData>(payload, passphrase);
        setSectionData(decrypted);
      } else {
        setSectionData(null);
      }
      setEditingSection(section);
    } catch {
      toast.error(t.vault.wrongPassphrase);
      lock();
    } finally {
      setIsLoadingSection(false);
    }
  }, [getSection, getPassphrase, lock, t]);

  // Save section data
  const handleSaveSection = useCallback(async (section: VaultSection, data: VaultSectionData) => {
    const passphrase = getPassphrase();
    if (!passphrase) return;

    setIsSaving(true);
    try {
      const encrypted = await encryptJSON(data, passphrase);
      const result = await saveSection(section, encrypted);
      
      if (result.synced) {
        toast.success(t.vault.sync.syncedToCloud);
      } else {
        toast.success(t.vault.sync.savedLocally);
      }
      
      await refresh();
    } finally {
      setIsSaving(false);
    }
  }, [getPassphrase, saveSection, refresh, t]);

  // Sync when coming online
  useEffect(() => {
    if (isOnline && isUnlocked && hasUnsyncedChanges) {
      sync();
    }
  }, [isOnline, isUnlocked, hasUnsyncedChanges, sync]);

  // Handle storage mode change
  const handleStorageModeChange = (mode: VaultStorageMode) => {
    setCurrentStorageMode(mode);
    setStorageMode(mode);
    toast.success(mode === 'device-cloud' 
      ? 'Backup cloud ativado' 
      : 'Modo apenas dispositivo ativado'
    );
    setShowSettings(false);
  };

  // Sync on mount if premium and unlocked
  useEffect(() => {
    if (isPremium && isUnlocked && isOnline) {
      sync();
    }
  }, [isPremium, isUnlocked, isOnline, sync]);

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
          <LoginGateCard feature={t.vault.title} />
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
        ) : !isUnlocked ? (
          <div className="container-wide section-padding py-8">
            <VaultUnlockForm onUnlock={() => refresh()} />
          </div>
        ) : showWizard ? (
          <VaultWizard
            onSaveSection={handleSaveSection}
            onComplete={() => {
              setShowWizard(false);
              setIsFirstTimeUser(false);
              refresh();
            }}
            isSaving={isSaving}
          />
        ) : (
          <div className="container-wide section-padding py-8">
            {/* Back to Dashboard */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="mb-4 gap-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>

            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Lock className="h-5 w-5 text-primary" />
                  </div>
                  <h1 className="text-2xl font-bold text-foreground">{t.vault.title}</h1>
                </div>
                <p className="text-muted-foreground">{t.vault.subtitle}</p>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                {/* Auto-lock timer */}
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{t.vault.autoLock} {formatTimeUntilLock(timeUntilLock)}</span>
                </div>

                <VaultSyncStatus
                  isOnline={isOnline}
                  isSyncing={isSyncing}
                  hasUnsyncedChanges={hasUnsyncedChanges}
                  onSync={sync}
                />

                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setShowSettings(true)}
                  className="text-muted-foreground hover:text-foreground"
                  title="Vault Settings"
                >
                  <Settings className="h-4 w-4" />
                </Button>

                <Button variant="outline" onClick={lock} className="gap-2">
                  <Lock className="h-4 w-4" />
                  {t.vault.lockVault}
                </Button>
              </div>
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

            {/* Loading section indicator */}
            {isLoadingSection && (
              <div className="text-center py-8 text-muted-foreground">{t.common.loading}</div>
            )}

            {/* Sections Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {VAULT_SECTIONS.map((section) => {
                const status = sectionStatuses.find(s => s.section === section) || {
                  section,
                  hasData: false,
                  updatedAt: null,
                  isSynced: true,
                };
                return (
                  <VaultSectionCard
                    key={section}
                    section={section}
                    status={status}
                    onEdit={handleEditSection}
                  />
                );
              })}
            </div>
          </div>
        )}
      </main>

      <Footer />

      {/* Section Editor Modal */}
      {editingSection && (
        <VaultSectionEditor
          section={editingSection}
          open={!!editingSection}
          onOpenChange={(open) => !open && setEditingSection(null)}
          initialData={sectionData}
          onSave={handleSaveSection}
          isSaving={isSaving}
        />
      )}

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Definições do Cofre
            </DialogTitle>
            <DialogDescription>
              Configura como os teus dados são guardados.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <StorageModeSelector 
              value={currentStorageMode}
              onChange={handleStorageModeChange}
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettings(false)}>
              {t.common.close}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

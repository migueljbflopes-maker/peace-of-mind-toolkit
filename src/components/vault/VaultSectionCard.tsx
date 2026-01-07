/**
 * Vault Section Card Component
 */

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, Users, Heart, Wallet, Smartphone, CheckCircle, Circle, Clock } from 'lucide-react';
import { useLocale } from '@/i18n/useLocale';
import { VaultSection, VaultSectionStatus } from '@/hooks/useVaultSync';

const sectionIcons: Record<VaultSection, React.ComponentType<{ className?: string }>> = {
  ids: CreditCard,
  contacts: Users,
  medical: Heart,
  finance: Wallet,
  devices: Smartphone,
};

interface VaultSectionCardProps {
  section: VaultSection;
  status: VaultSectionStatus;
  onEdit: (section: VaultSection) => void;
}

export function VaultSectionCard({ section, status, onEdit }: VaultSectionCardProps) {
  const { t } = useLocale();
  const Icon = sectionIcons[section];

  const getStatusIcon = () => {
    if (!status.hasData) {
      return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
    return <CheckCircle className="h-4 w-4 text-primary" />;
  };

  const getStatusLabel = () => {
    if (!status.hasData) {
      return t.vault.status.empty;
    }
    return t.vault.status.complete;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">{t.vault.sections[section]}</h3>
              <p className="text-sm text-muted-foreground">{t.vault.sectionDescriptions[section]}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-sm">
            {getStatusIcon()}
            <span className="text-muted-foreground">{getStatusLabel()}</span>
          </div>
        </div>
        
        {status.updatedAt && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
            <Clock className="h-3 w-3" />
            <span>{t.vault.status.lastUpdated}: {formatDate(status.updatedAt)}</span>
          </div>
        )}

        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => onEdit(section)}
          className="w-full"
        >
          {t.vault.edit}
        </Button>
      </CardContent>
    </Card>
  );
}

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Loader2, Save } from 'lucide-react';
import { AlertPreferences } from '@/hooks/useAlertPreferences';
import { useLocale } from '@/i18n/useLocale';
import { toast } from 'sonner';

interface AlertPreferencesFormProps {
  preferences: AlertPreferences;
  isSaving: boolean;
  onSave: (prefs: Partial<AlertPreferences>) => Promise<boolean>;
}

const TOPICS = [
  'Conflict & Geopolitics',
  'Natural Hazards',
  'Public Health',
  'Cyber & Outages',
  'Supply & Infrastructure',
  'Travel Disruptions',
];

const REGIONS = [
  'Global',
  'Europe',
  'North America',
  'Middle East',
  'Asia',
  'Africa',
];

export function AlertPreferencesForm({ preferences, isSaving, onSave }: AlertPreferencesFormProps) {
  const { t } = useLocale();
  const [localPrefs, setLocalPrefs] = useState<AlertPreferences>(preferences);

  const toggleTopic = (topic: string) => {
    setLocalPrefs(prev => ({
      ...prev,
      topics: prev.topics.includes(topic)
        ? prev.topics.filter(t => t !== topic)
        : [...prev.topics, topic],
    }));
  };

  const toggleRegion = (region: string) => {
    setLocalPrefs(prev => ({
      ...prev,
      regions: prev.regions.includes(region)
        ? prev.regions.filter(r => r !== region)
        : [...prev.regions, region],
    }));
  };

  const handleSave = async () => {
    const success = await onSave(localPrefs);
    if (success) {
      toast.success(t.alerts.preferencesSaved);
    } else {
      toast.error(t.alerts.saveFailed);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Settings className="h-4 w-4" />
          {t.alerts.preferences}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable Toggle */}
        <div className="flex items-center justify-between">
          <Label htmlFor="alerts-enabled" className="text-sm font-medium">
            {t.alerts.enableAlerts}
          </Label>
          <Switch
            id="alerts-enabled"
            checked={localPrefs.enabled}
            onCheckedChange={(checked) => setLocalPrefs(prev => ({ ...prev, enabled: checked }))}
          />
        </div>

        {/* Topics */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">{t.alerts.topics}</Label>
          <div className="flex flex-wrap gap-2">
            {TOPICS.map((topic) => (
              <Badge
                key={topic}
                variant={localPrefs.topics.includes(topic) ? 'default' : 'outline'}
                className="cursor-pointer hover:bg-primary/80 transition-colors"
                onClick={() => toggleTopic(topic)}
              >
                {topic}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {localPrefs.topics.length === 0 ? t.alerts.allTopics : `${localPrefs.topics.length} selected`}
          </p>
        </div>

        {/* Regions */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">{t.alerts.regions}</Label>
          <div className="flex flex-wrap gap-2">
            {REGIONS.map((region) => (
              <Badge
                key={region}
                variant={localPrefs.regions.includes(region) ? 'default' : 'outline'}
                className="cursor-pointer hover:bg-primary/80 transition-colors"
                onClick={() => toggleRegion(region)}
              >
                {region}
              </Badge>
            ))}
          </div>
        </div>

        {/* Severity */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">{t.alerts.severity}</Label>
          <Select
            value={localPrefs.severityThreshold}
            onValueChange={(value: 'major' | 'moderate') => 
              setLocalPrefs(prev => ({ ...prev, severityThreshold: value }))
            }
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="major">{t.alerts.majorOnly}</SelectItem>
              <SelectItem value="moderate">{t.alerts.majorAndModerate}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Frequency */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">{t.alerts.frequency}</Label>
          <Select
            value={localPrefs.frequency}
            onValueChange={(value: 'immediate' | 'daily' | 'weekly') => 
              setLocalPrefs(prev => ({ ...prev, frequency: value }))
            }
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="immediate">{t.alerts.immediate}</SelectItem>
              <SelectItem value="daily">{t.alerts.dailyDigest}</SelectItem>
              <SelectItem value="weekly">{t.alerts.weeklyDigest}</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{t.alerts.frequencyNote}</p>
        </div>

        {/* Save Button */}
        <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {t.common.loading}
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {t.alerts.savePreferences}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

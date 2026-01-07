import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, ExternalLink, CheckCircle2, RefreshCw, Loader2 } from 'lucide-react';
import { AlertItem } from '@/hooks/useAlertsInbox';
import { useLocale } from '@/i18n/useLocale';
import { toast } from 'sonner';

interface AlertsInboxProps {
  alerts: AlertItem[];
  isLoading: boolean;
  newCount: number;
  onMarkAsSeen: () => Promise<boolean>;
  onRefresh: () => void;
}

export function AlertsInbox({ alerts, isLoading, newCount, onMarkAsSeen, onRefresh }: AlertsInboxProps) {
  const { t, locale } = useLocale();

  const handleMarkAsSeen = async () => {
    const success = await onMarkAsSeen();
    if (success) {
      toast.success(t.alerts.markedAsSeen);
    }
  };

  const handleOpenLink = (url: string) => {
    try {
      const win = window.open(url, '_blank', 'noopener,noreferrer');
      if (!win) {
        toast.error(t.alerts.blockedLink);
      }
    } catch {
      toast.error(t.alerts.linkError);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString(locale === 'pt' ? 'pt-PT' : 'en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" />
            {t.alerts.inbox}
            {newCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {newCount} {t.alerts.new}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onRefresh} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            {newCount > 0 && (
              <Button variant="outline" size="sm" onClick={handleMarkAsSeen}>
                {t.alerts.markAsSeen}
              </Button>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {t.alerts.inboxDescription}
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-3" />
            <p className="font-medium">{t.alerts.noAlerts}</p>
            <p className="text-sm text-muted-foreground">{t.alerts.upToDate}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Badges */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge
                        variant={alert.severity === 'major' ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {alert.severity}
                      </Badge>
                      <Badge variant="outline" className="text-xs capitalize">
                        {alert.kind}
                      </Badge>
                      {alert.region && (
                        <Badge variant="outline" className="text-xs">
                          {alert.region}
                        </Badge>
                      )}
                      {alert.topics.slice(0, 1).map((topic) => (
                        <Badge key={topic} variant="outline" className="text-xs">
                          {topic}
                        </Badge>
                      ))}
                    </div>
                    
                    {/* Title */}
                    <h4 className="font-medium text-foreground line-clamp-2">
                      {alert.title}
                    </h4>
                    
                    {/* Summary */}
                    {alert.summary && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {alert.summary}
                      </p>
                    )}
                    
                    {/* Meta */}
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDate(alert.publishedAt)}
                      {alert.domain && <span className="ml-1">• {alert.domain}</span>}
                    </p>
                  </div>
                  
                  {/* Open Link */}
                  {alert.url && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenLink(alert.url!)}
                      className="shrink-0"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Download, FileText, ChevronLeft, Loader2, Check, CheckCircle } from 'lucide-react';
import { useLocale } from '@/i18n/useLocale';
import { useRedFolderData } from '@/hooks/useRedFolderData';
import { buildRedFolderPdf } from '@/lib/pdf/redFolderPdf';
import { toast } from 'sonner';

interface Props {
  onComplete: () => void;
  onBack: () => void;
}

export default function OnboardingStep4Export({ onComplete, onBack }: Props) {
  const { t, locale } = useLocale();
  const { isLoading: dataLoading, loadAllData } = useRedFolderData();
  
  const [generating, setGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState(false);

  const handleGeneratePdf = async () => {
    setGenerating(true);
    try {
      const data = await loadAllData();
      
      if (!data) {
        toast.error('Failed to load data');
        setGenerating(false);
        return;
      }

      const blob = await buildRedFolderPdf(data) as Blob;

      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      toast.success(t.redFolder.pdfReady);
    } catch (err) {
      console.error('Error generating PDF:', err);
      toast.error('Failed to generate PDF');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!pdfUrl) return;
    
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `resiliency-plan-${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setDownloaded(true);
    toast.success(t.onboarding?.pdfDownloaded || 'PDF downloaded');
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Download className="h-8 w-8 text-primary" />
        </div>
        <CardTitle>{t.onboarding?.step4Title || 'Export your printable plan'}</CardTitle>
        <CardDescription>{t.onboarding?.step4Desc || 'Generate a printable offline PDF (Red Folder format).'}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* PDF generation area */}
        <div className="p-6 border-2 border-dashed rounded-lg text-center">
          {!pdfUrl ? (
            <>
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                {t.onboarding?.pdfExplainer || 'Your PDF includes contacts, medical info, Plans A & B, and supplies checklist.'}
              </p>
              <Button 
                size="lg" 
                onClick={handleGeneratePdf}
                disabled={generating || dataLoading}
              >
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t.redFolder.generating}
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    {t.redFolder.generatePdf}
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-green-100 mb-4">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-medium mb-2">{t.redFolder.pdfReady}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t.redFolder.pdfReadyDesc}
              </p>
              <Button 
                size="lg" 
                onClick={handleDownload}
                variant={downloaded ? 'outline' : 'default'}
              >
                {downloaded ? (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                    {t.onboarding?.downloadAgain || 'Download again'}
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    {t.redFolder.downloadPdf}
                  </>
                )}
              </Button>
            </>
          )}
        </div>

        {/* What's included */}
        <div className="bg-muted/50 rounded-lg p-4">
          <h4 className="text-sm font-medium mb-3">{t.redFolder.includes}</h4>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              {t.redFolder.includesList.contacts}
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              {t.redFolder.includesList.plans}
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              {t.redFolder.includesList.supplies}
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              {t.redFolder.includesList.medical}
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={onBack}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            {t.common.back}
          </Button>
          <Button 
            className="flex-1" 
            onClick={onComplete}
            variant={downloaded ? 'default' : 'outline'}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            {t.onboarding?.markComplete || 'Mark setup complete'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
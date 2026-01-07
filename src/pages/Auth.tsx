import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Loader2, Mail, CheckCircle2, ArrowLeft, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/i18n/useLocale';
import { useToast } from '@/hooks/use-toast';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { z } from 'zod';

const emailSchema = z.string().trim().email({ message: 'Please enter a valid email address' }).max(255);

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnUrl = searchParams.get('return_url') || '/dashboard';
  
  const { t } = useLocale();
  const { toast } = useToast();
  const { signInWithMagicLink, isAuthenticated, loading: authLoading } = useAuth();
  
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      navigate(returnUrl);
    }
  }, [isAuthenticated, authLoading, navigate, returnUrl]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate email
    const result = emailSchema.safeParse(email);
    if (!result.success) {
      toast({ variant: 'destructive', title: result.error.errors[0].message });
      return;
    }

    setLoading(true);

    const { error } = await signInWithMagicLink(result.data, returnUrl);
    
    if (!error) {
      setEmailSent(true);
      setResendCooldown(30);
      toast({ title: t.auth.magicLinkSent });
    }

    setLoading(false);
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    
    setLoading(true);
    const { error } = await signInWithMagicLink(email, returnUrl);
    
    if (!error) {
      setResendCooldown(30);
      toast({ title: t.auth.magicLinkResent });
    }
    
    setLoading(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-4xl grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left side - Branding and benefits */}
          <div className="hidden lg:block">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 rounded-xl bg-primary/10">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <span className="text-xl font-semibold text-foreground">Resilient.app</span>
            </div>
            
            <h1 className="text-3xl font-bold text-foreground mb-4">
              {t.auth.magicLinkTitle}
            </h1>
            
            <p className="text-muted-foreground mb-8">
              {t.auth.magicLinkSubtitle}
            </p>
            
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-foreground">{t.auth.benefit1}</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-foreground">{t.auth.benefit2}</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-foreground">{t.auth.benefit3}</span>
              </li>
            </ul>
          </div>

          {/* Right side - Login card */}
          <Card className="w-full shadow-lg border-border/50">
            <CardHeader className="text-center pb-2">
              <div className="lg:hidden mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-xl">
                {emailSent ? t.auth.checkYourInbox : t.auth.signInTitle}
              </CardTitle>
              <CardDescription>
                {emailSent ? t.auth.magicLinkSentDesc : t.auth.signInDesc}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="pt-4">
              {!emailSent ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">{t.auth.email}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        required
                        autoComplete="email"
                      />
                    </div>
                  </div>
                  
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Mail className="mr-2 h-4 w-4" />
                    )}
                    {t.auth.sendMagicLink}
                  </Button>
                  
                  <p className="text-xs text-center text-muted-foreground">
                    {t.auth.magicLinkNote}
                  </p>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-primary/5 rounded-xl text-center">
                    <Mail className="h-10 w-10 text-primary mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      {t.auth.checkEmail} <strong className="text-foreground">{email}</strong>
                    </p>
                  </div>
                  
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleResend}
                    disabled={resendCooldown > 0 || loading}
                  >
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    {resendCooldown > 0 
                      ? `${t.auth.resendIn} ${resendCooldown}s` 
                      : t.auth.resendLink
                    }
                  </Button>
                  
                  <Button
                    variant="ghost"
                    className="w-full text-muted-foreground"
                    onClick={() => setEmailSent(false)}
                  >
                    {t.auth.tryDifferentEmail}
                  </Button>
                </div>
              )}
              
              {returnUrl !== '/dashboard' && (
                <div className="mt-6 pt-4 border-t border-border">
                  <Link 
                    to={returnUrl}
                    className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    {t.auth.backToPage}
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}

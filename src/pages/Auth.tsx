import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Mail, CheckCircle2, ArrowLeft, RefreshCw, Eye, EyeOff, Lock } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/i18n/useLocale';
import { useToast } from '@/hooks/use-toast';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { z } from 'zod';

const emailSchema = z.string().trim().email({ message: 'Please enter a valid email address' }).max(255);
const passwordSchema = z.string().min(6, { message: 'Password must be at least 6 characters' });

type AuthMode = 'login' | 'signup';
type AuthMethod = 'magic-link' | 'password';

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnUrl = searchParams.get('return_url') || '/dashboard';
  
  const { t } = useLocale();
  const { toast } = useToast();
  const { signInWithMagicLink, signIn, signUp, isAuthenticated, loading: authLoading } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [authMethod, setAuthMethod] = useState<AuthMethod>('magic-link');
  const [authMode, setAuthMode] = useState<AuthMode>('login');

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

  const handleMagicLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate email
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      toast({ variant: 'destructive', title: emailResult.error.errors[0].message });
      return;
    }

    // Validate password
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      toast({ variant: 'destructive', title: passwordResult.error.errors[0].message });
      return;
    }

    // For signup, check password confirmation
    if (authMode === 'signup') {
      if (password !== confirmPassword) {
        toast({ variant: 'destructive', title: 'Passwords do not match' });
        return;
      }
    }

    setLoading(true);
    
    if (authMode === 'login') {
      const { error } = await signIn(emailResult.data, password);
      if (!error) {
        toast({ title: t.auth.loginSuccess });
        navigate(returnUrl);
      }
    } else {
      const { error } = await signUp(emailResult.data, password);
      if (!error) {
        toast({ title: t.auth.signupSuccess });
      }
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
            <div className="mb-6">
              <Logo size="lg" showText />
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
              <div className="lg:hidden mx-auto mb-4">
                <Logo size="md" showText />
              </div>
              <CardTitle className="text-xl">
                {emailSent ? t.auth.checkYourInbox : t.auth.signInTitle}
              </CardTitle>
              <CardDescription>
                {emailSent ? t.auth.magicLinkSentDesc : (authMethod === 'magic-link' ? t.auth.signInDesc : (authMode === 'login' ? 'Sign in with your email and password' : 'Create an account with email and password'))}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="pt-4">
              {!emailSent ? (
                <div className="space-y-4">
                  {/* Method tabs */}
                  <Tabs value={authMethod} onValueChange={(v) => setAuthMethod(v as AuthMethod)} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="magic-link" className="gap-2">
                        <Mail className="h-4 w-4" />
                        Magic Link
                      </TabsTrigger>
                      <TabsTrigger value="password" className="gap-2">
                        <Lock className="h-4 w-4" />
                        Password
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="magic-link" className="mt-4">
                      <form onSubmit={handleMagicLinkSubmit} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="magic-email">{t.auth.email}</Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="magic-email"
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
                    </TabsContent>
                    
                    <TabsContent value="password" className="mt-4">
                      <form onSubmit={handlePasswordSubmit} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="password-email">{t.auth.email}</Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="password-email"
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
                        
                        <div className="space-y-2">
                          <Label htmlFor="password">{t.auth.password}</Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="password"
                              type={showPassword ? 'text' : 'password'}
                              placeholder="••••••••"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="pl-10 pr-10"
                              required
                              autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                        
                        {authMode === 'signup' && (
                          <div className="space-y-2">
                            <Label htmlFor="confirm-password">{t.auth.confirmPassword}</Label>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="confirm-password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="pl-10"
                                required
                                autoComplete="new-password"
                              />
                            </div>
                          </div>
                        )}
                        
                        <Button type="submit" className="w-full" disabled={loading}>
                          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {authMode === 'login' ? t.auth.login : t.auth.signup}
                        </Button>
                        
                        <p className="text-sm text-center text-muted-foreground">
                          {authMode === 'login' ? (
                            <>
                              {t.auth.noAccount}{' '}
                              <button
                                type="button"
                                onClick={() => setAuthMode('signup')}
                                className="text-primary hover:underline font-medium"
                              >
                                {t.auth.signup}
                              </button>
                            </>
                          ) : (
                            <>
                              {t.auth.hasAccount}{' '}
                              <button
                                type="button"
                                onClick={() => setAuthMode('login')}
                                className="text-primary hover:underline font-medium"
                              >
                                {t.auth.login}
                              </button>
                            </>
                          )}
                        </p>
                      </form>
                    </TabsContent>
                  </Tabs>
                </div>
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

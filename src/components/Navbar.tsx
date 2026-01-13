import { useState, forwardRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Shield,
  Menu,
  X,
  ChevronDown,
  AlertTriangle,
  Package,
  Library,
  Lightbulb,
  Newspaper,
  CreditCard,
  LayoutGrid,
  User,
  LogOut,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useAuth } from "@/hooks/useAuth";
import { useLocale } from "@/i18n/useLocale";
import logoPulse from "@/assets/logo-pulse.png";

const Navbar = forwardRef<HTMLElement>((_, ref) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [bePreparedOpen, setBePreparedOpen] = useState(false);
  const { user, isAuthenticated, signOut, loading } = useAuth();
  const { t } = useLocale();
  const location = useLocation();

  // Build login URL with current path as return_url
  const getLoginUrl = () => {
    const currentPath = location.pathname + location.search;
    // Don't add return_url for auth-related pages
    if (currentPath === '/login' || currentPath.startsWith('/auth')) {
      return '/login';
    }
    return `/login?return_url=${encodeURIComponent(currentPath)}`;
  };

  const navLinks = [
    { label: "Safe Toolkit", href: "/toolkit", icon: Shield },
    { label: "Panic Button", href: "/panic", icon: AlertTriangle },
    { label: t.nav.library, href: "/library", icon: Library },
    { label: t.nav.tips, href: "/tips", icon: Lightbulb },
    { label: t.nav.news, href: "/news/weekly", icon: Newspaper },
    { label: t.nav.pricing, href: "/pricing", icon: CreditCard },
  ];

  const bePreparedLinks = [
    { label: t.nav.calculatorsHub, href: "/be-prepared", icon: LayoutGrid },
    { label: t.nav.riskCalculator, href: "/tools/risk", icon: AlertTriangle },
    { label: t.nav.suppliesPlanner, href: "/tools/supplies", icon: Package },
    { label: t.nav.products, href: "/products", icon: Package },
    { label: t.nav.tips, href: "/tips", icon: Lightbulb },
    { label: t.nav.news, href: "/news/weekly", icon: Newspaper },
  ];

  const handleSignOut = async () => {
    // Close menu BEFORE signOut to ensure clean state
    setMobileMenuOpen(false);
    await signOut(); // signOut handles redirect via window.location.assign
  };

  return (
    <nav ref={ref} className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/50">
      <div className="container-wide section-padding">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <img src={logoPulse} alt="am-I-ready" className="h-8 w-8" />
            <span className="font-semibold text-foreground">am-I-ready.com</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            <Link to="/toolkit">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1">
                <Shield className="h-3.5 w-3.5" />
                Safe Toolkit
              </Button>
            </Link>

            <Link to="/panic">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                Panic Button
              </Button>
            </Link>

            {/* Be Prepared Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1">
                  {t.nav.bePrepared}
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {bePreparedLinks.map((link) => (
                  <DropdownMenuItem key={link.href} asChild>
                    <Link to={link.href} className="flex items-center gap-2 cursor-pointer">
                      <link.icon className="h-4 w-4 text-muted-foreground" />
                      {link.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Link to="/library">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                {t.nav.library}
              </Button>
            </Link>

            <Link to="/pricing">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                {t.nav.pricing}
              </Button>
            </Link>

            {isAuthenticated && (
              <Link to="/dashboard">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  {t.nav.dashboard}
                </Button>
              </Link>
            )}
          </div>

          {/* Desktop CTAs */}
          <div className="hidden lg:flex items-center gap-2">
            <LanguageSwitcher />
            
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <User className="h-4 w-4" />
                    <span className="max-w-[120px] truncate text-sm">
                      {user?.email?.split('@')[0]}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard" className="cursor-pointer">
                      {t.nav.dashboard}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onSelect={(e) => { 
                      e.preventDefault(); 
                      handleSignOut(); 
                    }} 
                    className="cursor-pointer text-destructive"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    {t.nav.logout}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link to={getLoginUrl()}>
                  <Button variant="ghost" size="sm">
                    {t.nav.login}
                  </Button>
                </Link>
                <Link to="/pricing">
                  <Button variant="nav-outline" size="sm">
                    {t.nav.unlockPremium}
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="lg:hidden flex items-center gap-2">
            <LanguageSwitcher />
            <button
              className="p-2 rounded-lg hover:bg-accent transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5 text-foreground" />
              ) : (
                <Menu className="h-5 w-5 text-foreground" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-border bg-background animate-fade-in">
          <div className="section-padding py-4 space-y-2">
            <Link
              to="/toolkit"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors bg-primary/5"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Shield className="h-4 w-4 text-primary" />
              <span className="font-medium">Safe Toolkit</span>
            </Link>

            <Link
              to="/panic"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors bg-destructive/5"
              onClick={() => setMobileMenuOpen(false)}
            >
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="font-medium">Panic Button</span>
            </Link>

            <Link
              to="/library"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Library className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{t.nav.library}</span>
            </Link>

            {/* Be Prepared Accordion */}
            <Collapsible open={bePreparedOpen} onOpenChange={setBePreparedOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg hover:bg-accent transition-colors">
                <div className="flex items-center gap-3">
                  <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{t.nav.bePrepared}</span>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${
                    bePreparedOpen ? "rotate-180" : ""
                  }`}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-6 space-y-1 mt-1">
                {bePreparedLinks.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <link.icon className="h-4 w-4" />
                    <span className="text-sm">{link.label}</span>
                  </Link>
                ))}
              </CollapsibleContent>
            </Collapsible>

            <Link
              to="/pricing"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{t.nav.pricing}</span>
            </Link>

            {isAuthenticated && (
              <Link
                to="/dashboard"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{t.nav.dashboard}</span>
              </Link>
            )}

            <div className="pt-4 border-t border-border space-y-2">
              {loading ? (
                <Skeleton className="h-10 w-full" />
              ) : isAuthenticated ? (
                <>
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    {user?.email}
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-2" 
                    onClick={handleSignOut}
                  >
                    <LogOut className="h-4 w-4" />
                    {t.nav.logout}
                  </Button>
                </>
              ) : (
                <>
                  <Link to={getLoginUrl()} onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full">
                      {t.nav.login}
                    </Button>
                  </Link>
                  <Link to="/pricing" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="hero-outline" className="w-full">
                      {t.nav.unlockPremium}
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
});

Navbar.displayName = "Navbar";

export default Navbar;
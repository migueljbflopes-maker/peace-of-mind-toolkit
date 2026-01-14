import { useState, forwardRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { Logo } from "@/components/Logo";
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
  Star,
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
import logoNew from "@/assets/logo-new.png";

const Navbar = forwardRef<HTMLElement>((_, ref) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [bePreparedOpen, setBePreparedOpen] = useState(false);
  const [featuresOpen, setFeaturesOpen] = useState(false);
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

  // Features dropdown: Safe Toolkit, Panic Button, Pricing
  const featuresLinks = [
    { label: "Safe Toolkit", href: "/toolkit", icon: Shield },
    { label: "Panic Button", href: "/panic", icon: AlertTriangle },
    { label: t.nav.pricing, href: "/pricing", icon: CreditCard },
  ];

  // Be Prepared dropdown: Calculators, Risk, Supplies, Products, Library, Tips, News
  const bePreparedLinks = [
    { label: t.nav.calculatorsHub, href: "/be-prepared", icon: LayoutGrid },
    { label: t.nav.riskCalculator, href: "/tools/risk", icon: AlertTriangle },
    { label: t.nav.suppliesPlanner, href: "/tools/supplies", icon: Package },
    { label: t.nav.products, href: "/products", icon: Package },
    { label: t.nav.library, href: "/library", icon: Library },
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
          <Logo size="md" showText linkTo="/" />

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {/* Features Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1">
                  <Star className="h-3.5 w-3.5" />
                  Features
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {featuresLinks.map((link) => (
                  <DropdownMenuItem key={link.href} asChild>
                    <Link to={link.href} className="flex items-center gap-2 cursor-pointer">
                      <link.icon className="h-4 w-4 text-muted-foreground" />
                      {link.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

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
            {/* Features Accordion */}
            <Collapsible open={featuresOpen} onOpenChange={setFeaturesOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg hover:bg-accent transition-colors">
                <div className="flex items-center gap-3">
                  <Star className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Features</span>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${
                    featuresOpen ? "rotate-180" : ""
                  }`}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-6 space-y-1 mt-1">
                {featuresLinks.map((link) => (
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

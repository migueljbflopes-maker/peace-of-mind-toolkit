import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [bePreparedOpen, setBePreparedOpen] = useState(false);

  const navLinks = [
    { label: "Library", href: "/library", icon: Library },
    { label: "Tips & Peace of Mind", href: "/tips", icon: Lightbulb },
    { label: "News", href: "/news/weekly", icon: Newspaper },
    { label: "Pricing", href: "/pricing", icon: CreditCard },
  ];

  const bePreparedLinks = [
    { label: "Risk Calculator", href: "/tools/risk", icon: AlertTriangle },
    { label: "14-Day Supplies Planner", href: "/tools/supplies", icon: Package },
    { label: "Products", href: "#products", icon: Package },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/50">
      <div className="container-wide section-padding">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="p-1.5 rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-colors">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <span className="font-semibold text-foreground">Resilient.app</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            <Link to="/library">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                Library
              </Button>
            </Link>

            {/* Be Prepared Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1">
                  Be Prepared
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

            <Link to="/tips">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                Tips & Peace of Mind
              </Button>
            </Link>

            <Link to="/news/weekly">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                News
              </Button>
            </Link>

            <Link to="/pricing">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                Pricing
              </Button>
            </Link>
          </div>

          {/* Desktop CTAs */}
          <div className="hidden lg:flex items-center gap-3">
            <Link to="/start">
              <Button variant="nav-primary" size="sm">
                Start Free
              </Button>
            </Link>
            <Link to="/pricing">
              <Button variant="nav-outline" size="sm">
                Unlock Premium
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-accent transition-colors"
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

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-border bg-background animate-fade-in">
          <div className="section-padding py-4 space-y-2">
            <Link
              to="/library"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Library className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Library</span>
            </Link>

            {/* Be Prepared Accordion */}
            <Collapsible open={bePreparedOpen} onOpenChange={setBePreparedOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg hover:bg-accent transition-colors">
                <div className="flex items-center gap-3">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Be Prepared</span>
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
              to="/tips"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Lightbulb className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Tips & Peace of Mind</span>
            </Link>

            <Link
              to="/news/weekly"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Newspaper className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">News</span>
            </Link>

            <Link
              to="/pricing"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Pricing</span>
            </Link>

            <div className="pt-4 border-t border-border space-y-2">
              <Link to="/start" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="hero" className="w-full">
                  Start Free
                </Button>
              </Link>
              <Link to="/pricing" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="hero-outline" className="w-full">
                  Unlock Premium
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;

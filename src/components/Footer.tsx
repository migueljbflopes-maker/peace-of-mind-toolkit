import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";

const Footer = forwardRef<HTMLElement>((_, ref) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer ref={ref} className="border-t border-border bg-background">
      <div className="container-wide section-padding py-12">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="mb-4">
              <Logo size="sm" showText linkTo="/" />
            </div>
            <p className="text-sm text-muted-foreground max-w-sm mb-4">
              Your offline-first preparedness toolkit. Be prepared, even when the internet is down.
            </p>
            <p className="text-xs text-muted-foreground/70">
              ⚠️ Disclaimer: Always follow guidance from your local civil protection authorities. 
              am-I-ready.com provides general information and should not replace official emergency instructions.
            </p>
          </div>

          {/* Tools */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Tools</h4>
            <ul className="space-y-2.5">
              <li>
                <Link to="/tools/risk" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Risk Calculator
                </Link>
              </li>
              <li>
                <Link to="/tools/supplies" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Supplies Planner
                </Link>
              </li>
              <li>
                <Link to="/library" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Library
                </Link>
              </li>
              <li>
                <Link to="/tips" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Tips & Peace of Mind
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Legal</h4>
            <ul className="space-y-2.5">
              <li>
                <Link to="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <a href="mailto:privacy@am-i-ready.com" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Contact
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border">
          <p className="text-sm text-muted-foreground text-center">
            © {currentYear} am-I-ready.com. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = "Footer";

export default Footer;
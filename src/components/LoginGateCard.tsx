import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, ChevronRight } from "lucide-react";
import { useLocale } from "@/i18n/useLocale";

interface LoginGateCardProps {
  className?: string;
  compact?: boolean;
  feature?: string;
}

export function LoginGateCard({ className, compact = false, feature }: LoginGateCardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLocale();

  const returnUrl = location.pathname + location.search;

  const handleLogin = () => {
    navigate(`/login?return_url=${encodeURIComponent(returnUrl)}`);
  };

  if (compact) {
    return (
      <div className={className}>
        <Button 
          onClick={handleLogin} 
          variant="outline" 
          className="w-full justify-between"
        >
          <span className="flex items-center gap-2">
            <User className="h-4 w-4" />
            {t.auth.saveAndContinue}
          </span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <User className="h-4 w-4 text-primary" />
          </div>
          <CardTitle className="text-base">{feature || t.auth.saveAndContinue}</CardTitle>
        </div>
        <CardDescription>{t.auth.saveAndContinueDesc}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handleLogin} className="w-full">
          {t.auth.loginOrCreate}
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}

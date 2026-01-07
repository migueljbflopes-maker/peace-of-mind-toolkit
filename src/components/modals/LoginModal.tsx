import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { User } from "lucide-react";
import { useLocale } from "@/i18n/useLocale";

interface LoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnUrl?: string;
}

export function LoginModal({ open, onOpenChange, returnUrl }: LoginModalProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLocale();

  // Use provided returnUrl, or fall back to current path
  const effectiveReturnUrl = returnUrl || location.pathname + location.search;

  const handleLogin = () => {
    onOpenChange(false);
    navigate(`/login?return_url=${encodeURIComponent(effectiveReturnUrl)}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <User className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-xl">{t.auth.saveAndContinue}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {t.auth.saveAndContinueDesc}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-4">
          <Button onClick={handleLogin} className="w-full">
            {t.auth.loginOrCreate}
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            className="w-full text-muted-foreground"
          >
            {t.common.notNow}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

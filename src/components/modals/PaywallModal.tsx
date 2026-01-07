import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Shield, FileText, Lock, Map, CheckCircle2 } from "lucide-react";

interface PaywallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PaywallModal({ open, onOpenChange }: PaywallModalProps) {
  const navigate = useNavigate();

  const handleUnlock = () => {
    onOpenChange(false);
    navigate("/pricing");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-xl">Unlock Premium</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Generate your Personalized Resiliency Plan: printable offline PDF, encrypted Vault, and Plans A & B.
          </DialogDescription>
        </DialogHeader>

        {/* Features */}
        <div className="my-4 space-y-2.5">
          <div className="flex items-center gap-3 text-sm">
            <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="text-foreground">Printable offline 'Red Folder' PDF</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="text-foreground">Encrypted Vault (IDs, contacts, medical)</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="text-foreground">Plans A & B (exit + emergency)</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="text-foreground">Encrypted backup & restore</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="text-foreground">Premium insights & next steps</span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Button onClick={handleUnlock} className="w-full" size="lg">
            Unlock Premium (€49)
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            className="w-full text-muted-foreground"
          >
            Not now
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            One-time purchase. No subscription.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

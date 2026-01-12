import { useNavigate } from "react-router-dom";
import { AlertCircle, Shield, FileText, FolderOpen, MapPin } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface MissingPreparednessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  missingItems: string[];
  onContinueAnyway: () => void;
}

const ITEM_CONFIG: Record<string, { label: string; icon: React.ElementType; route: string }> = {
  vault: {
    label: "Vault",
    icon: Shield,
    route: "/premium/vault",
  },
  plan_a: {
    label: "Plan A",
    icon: FileText,
    route: "/premium/plans",
  },
  plan_b: {
    label: "Plan B",
    icon: FileText,
    route: "/premium/plans",
  },
  red_folder: {
    label: "Red Folder",
    icon: FolderOpen,
    route: "/premium/red-folder",
  },
  location: {
    label: "Location",
    icon: MapPin,
    route: "",
  },
};

export function MissingPreparednessModal({
  open,
  onOpenChange,
  missingItems,
  onContinueAnyway,
}: MissingPreparednessModalProps) {
  const navigate = useNavigate();

  // Get the route for the first missing item
  const getFirstSetupRoute = (): string => {
    for (const item of missingItems) {
      const config = ITEM_CONFIG[item];
      if (config?.route) {
        return config.route;
      }
    }
    return "/premium/vault"; // Default fallback
  };

  const handleSetupNow = () => {
    const route = getFirstSetupRoute();
    onOpenChange(false);
    navigate(route);
  };

  const handleContinueAnyway = () => {
    onOpenChange(false);
    onContinueAnyway();
  };

  if (missingItems.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Almost ready
          </DialogTitle>
          <DialogDescription>
            To share these items in an emergency, you still need to set them up:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-4">
          {missingItems.map((item) => {
            const config = ITEM_CONFIG[item];
            if (!config) return null;
            const Icon = config.icon;

            return (
              <div
                key={item}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border"
              >
                <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <Icon className="h-4 w-4 text-amber-600" />
                </div>
                <span className="font-medium text-foreground">{config.label}</span>
                <span className="ml-auto text-xs text-muted-foreground">Not set up</span>
              </div>
            );
          })}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleContinueAnyway} className="w-full sm:w-auto">
            Continue anyway
          </Button>
          <Button variant="cta" onClick={handleSetupNow} className="w-full sm:w-auto">
            Set up now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

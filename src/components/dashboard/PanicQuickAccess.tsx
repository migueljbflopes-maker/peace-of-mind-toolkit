import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Settings, CheckCircle2, X, Loader2 } from "lucide-react";
import { usePanicTrigger, ScenarioType, TriggerState } from "@/hooks/usePanicTrigger";
import { cn } from "@/lib/utils";

export function PanicQuickAccess() {
  const [selectedScenario, setSelectedScenario] = useState<ScenarioType>("medical");
  const {
    state,
    holdProgress,
    cancelCountdown,
    startHold,
    releaseHold,
    cancelPanic,
    reset,
  } = usePanicTrigger();

  const scenarioLabels: Record<ScenarioType, string> = {
    medical: "Medical Emergency",
    natural: "Natural Disaster",
    security: "Security Threat",
    custom: "Custom Emergency",
  };

  const getButtonClasses = () => {
    const base = "relative w-24 h-24 rounded-full border-4 transition-all duration-200 flex items-center justify-center";
    
    switch (state) {
      case "holding":
        return cn(base, "border-destructive bg-destructive/20 scale-105");
      case "pending":
        return cn(base, "border-orange-500 bg-orange-100 animate-pulse");
      case "confirmed":
        return cn(base, "border-green-500 bg-green-100");
      case "cancelled":
        return cn(base, "border-muted bg-muted");
      case "error":
        return cn(base, "border-destructive bg-destructive/10");
      default:
        return cn(base, "border-destructive/50 bg-destructive/5 hover:bg-destructive/10 hover:border-destructive cursor-pointer");
    }
  };

  const renderButtonContent = () => {
    switch (state) {
      case "holding":
        return (
          <div className="relative w-full h-full flex items-center justify-center">
            <svg className="absolute inset-0 w-full h-full -rotate-90">
              <circle
                cx="50%"
                cy="50%"
                r="45%"
                fill="none"
                stroke="hsl(var(--destructive))"
                strokeWidth="4"
                strokeDasharray={`${holdProgress * 2.83} 283`}
                className="transition-all duration-75"
              />
            </svg>
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
        );
      case "pending":
        return (
          <div className="text-center">
            <span className="text-2xl font-bold text-orange-600">{cancelCountdown}</span>
            <p className="text-xs text-orange-600">seconds</p>
          </div>
        );
      case "confirmed":
        return <CheckCircle2 className="h-8 w-8 text-green-600" />;
      case "cancelled":
        return <X className="h-8 w-8 text-muted-foreground" />;
      case "cancelling":
        return <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />;
      case "error":
        return <AlertTriangle className="h-8 w-8 text-destructive" />;
      default:
        return <AlertTriangle className="h-8 w-8 text-destructive/70" />;
    }
  };

  const getStatusText = () => {
    switch (state) {
      case "holding":
        return "Keep holding...";
      case "pending":
        return "Tap to cancel";
      case "confirmed":
        return "Contacts notified";
      case "cancelled":
        return "Cancelled";
      case "cancelling":
        return "Cancelling...";
      case "error":
        return "Error occurred";
      default:
        return "Hold 3s to activate";
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Emergency Panic Button
          </CardTitle>
          <Link to="/panic/setup">
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              <Settings className="h-4 w-4 mr-1" />
              Setup
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-4">
          {/* Scenario Selector */}
          {state === "idle" && (
            <Select
              value={selectedScenario}
              onValueChange={(v) => setSelectedScenario(v as ScenarioType)}
            >
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(scenarioLabels) as ScenarioType[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {scenarioLabels[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Panic Button */}
          <button
            className={getButtonClasses()}
            onMouseDown={() => state === "idle" && startHold(selectedScenario, false)}
            onMouseUp={() => state === "holding" && releaseHold()}
            onMouseLeave={() => state === "holding" && releaseHold()}
            onTouchStart={() => state === "idle" && startHold(selectedScenario, false)}
            onTouchEnd={() => state === "holding" && releaseHold()}
            onClick={() => {
              if (state === "pending") cancelPanic();
              if (state === "confirmed" || state === "cancelled" || state === "error") reset();
            }}
            disabled={state === "cancelling"}
          >
            {renderButtonContent()}
          </button>

          {/* Status Text */}
          <p className="text-sm text-muted-foreground">{getStatusText()}</p>

          {/* Quick Links */}
          {state === "idle" && (
            <div className="flex gap-2 text-xs">
              <Link to="/panic/test" className="text-primary hover:underline">
                Test mode
              </Link>
              <span className="text-muted-foreground">•</span>
              <Link to="/panic/history" className="text-primary hover:underline">
                History
              </Link>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, CheckCircle, Shield, ArrowLeft, XCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePanicTrigger, ScenarioType } from "@/hooks/usePanicTrigger";
import { useAuth } from "@/hooks/useAuth";

const PanicTest = () => {
  const { user } = useAuth();
  const {
    state,
    holdProgress,
    cancelCountdown,
    startHold,
    releaseHold,
    cancelPanic,
    reset,
    error,
  } = usePanicTrigger();

  const [selectedScenario, setSelectedScenario] = useState<ScenarioType>("medical");

  const handleMouseDown = () => {
    if (state === "idle") {
      startHold(selectedScenario, true); // is_test = true
    }
  };

  const handleMouseUp = () => {
    if (state === "holding") {
      releaseHold();
    }
  };

  const renderContent = () => {
    switch (state) {
      case "confirmed":
        return (
          <div className="space-y-4">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <CheckCircle className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">Test Successful!</h2>
            <p className="text-muted-foreground text-sm">
              In a real emergency, your contacts would receive your location and emergency info.
            </p>
            <Button onClick={reset} variant="outline">
              Test Again
            </Button>
          </div>
        );

      case "cancelled":
        return (
          <div className="space-y-4">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto">
              <XCircle className="h-10 w-10 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">Cancelled</h2>
            <p className="text-muted-foreground text-sm">
              The panic activation was cancelled in time.
            </p>
          </div>
        );

      case "pending":
        return (
          <div className="space-y-6">
            <div className="w-32 h-32 rounded-full bg-amber-500 flex items-center justify-center mx-auto animate-pulse">
              <div className="text-white text-center">
                <div className="text-4xl font-bold">{cancelCountdown}</div>
                <div className="text-xs">seconds</div>
              </div>
            </div>
            <p className="text-amber-600 font-medium">Activating in {cancelCountdown} seconds...</p>
            <Button onClick={cancelPanic} variant="destructive" size="lg">
              Cancel Now
            </Button>
          </div>
        );

      case "error":
        return (
          <div className="space-y-4">
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <XCircle className="h-10 w-10 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">Error</h2>
            <p className="text-muted-foreground text-sm">{error || "Something went wrong"}</p>
            <Button onClick={reset} variant="outline">
              Try Again
            </Button>
          </div>
        );

      default: // idle or holding
        return (
          <div className="space-y-6">
            {/* Scenario selector */}
            <div className="max-w-xs mx-auto">
              <Select
                value={selectedScenario}
                onValueChange={(v) => setSelectedScenario(v as ScenarioType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select scenario" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="medical">Medical Emergency</SelectItem>
                  <SelectItem value="natural">Natural Disaster</SelectItem>
                  <SelectItem value="security">Security Threat</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <p className="text-sm text-muted-foreground mb-6">
              Hold the button for 3 seconds to activate
            </p>

            <button
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleMouseDown}
              onTouchEnd={handleMouseUp}
              disabled={!user}
              className="relative w-32 h-32 rounded-full mx-auto flex items-center justify-center cursor-pointer transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background:
                  state === "holding"
                    ? `conic-gradient(hsl(var(--destructive)) ${holdProgress}%, hsl(var(--muted)) ${holdProgress}%)`
                    : "hsl(var(--destructive))",
              }}
            >
              <div className="absolute inset-2 rounded-full bg-background flex items-center justify-center">
                <AlertCircle className="h-12 w-12 text-destructive" />
              </div>
            </button>

            <p className="text-xs text-muted-foreground">
              {!user ? "Please log in first" : state === "holding" ? "Keep holding..." : "Hold to activate"}
            </p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="py-8 md:py-12">
        <div className="container mx-auto px-4 max-w-xl text-center">
          {/* Header */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 text-sm font-medium mb-4">
              <Shield className="h-4 w-4" />
              Test Mode — No alerts will be sent
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
              Test Your Panic Button
            </h1>
            <p className="text-muted-foreground">
              Practice activating the button. Contacts will NOT be notified.
            </p>
          </div>

          {/* Test Area */}
          <Card className="mb-8">
            <CardContent className="py-12">{renderContent()}</CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-center gap-4">
            <Link to="/panic/setup">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Setup
              </Button>
            </Link>
            <Link to="/panic/history">
              <Button variant="ghost">View History</Button>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PanicTest;

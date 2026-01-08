import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, CheckCircle, Shield, ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const PanicTest = () => {
  const [testState, setTestState] = useState<"idle" | "holding" | "success">("idle");
  const [holdProgress, setHoldProgress] = useState(0);

  const handleMouseDown = () => {
    setTestState("holding");
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setHoldProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        setTestState("success");
      }
    }, 100);
  };

  const handleMouseUp = () => {
    if (testState === "holding") {
      setTestState("idle");
      setHoldProgress(0);
    }
  };

  const reset = () => {
    setTestState("idle");
    setHoldProgress(0);
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
            <CardContent className="py-12">
              {testState === "success" ? (
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
              ) : (
                <div className="space-y-6">
                  <p className="text-sm text-muted-foreground mb-6">
                    Hold the button for 1 second to activate
                  </p>
                  
                  <button
                    onMouseDown={handleMouseDown}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onTouchStart={handleMouseDown}
                    onTouchEnd={handleMouseUp}
                    className="relative w-32 h-32 rounded-full mx-auto flex items-center justify-center cursor-pointer transition-transform active:scale-95"
                    style={{
                      background: testState === "holding" 
                        ? `conic-gradient(hsl(var(--destructive)) ${holdProgress}%, hsl(var(--muted)) ${holdProgress}%)`
                        : "hsl(var(--destructive))",
                    }}
                  >
                    <div className="absolute inset-2 rounded-full bg-background flex items-center justify-center">
                      <AlertCircle className="h-12 w-12 text-destructive" />
                    </div>
                  </button>

                  <p className="text-xs text-muted-foreground">
                    {testState === "holding" ? "Keep holding..." : "Hold to activate"}
                  </p>
                </div>
              )}
            </CardContent>
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
              <Button variant="ghost">
                View History
              </Button>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PanicTest;

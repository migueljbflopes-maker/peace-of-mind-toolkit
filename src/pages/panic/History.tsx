import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Clock, AlertCircle, ArrowLeft, Shield, CheckCircle, XCircle, FlaskConical, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEntitlements } from "@/hooks/useEntitlements";
import { PremiumLockedState } from "@/components/PremiumLockedState";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

interface PanicActivation {
  id: string;
  scenario_type: string;
  status: string;
  is_test: boolean;
  activated_at: string;
  cancelled_at: string | null;
  confirmed_at: string | null;
  completed_at: string | null;
}

const statusConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  pending: { icon: Clock, color: "text-amber-500", label: "Pending" },
  confirmed: { icon: CheckCircle, color: "text-primary", label: "Confirmed" },
  completed: { icon: CheckCircle, color: "text-primary", label: "Completed" },
  cancelled: { icon: XCircle, color: "text-muted-foreground", label: "Cancelled" },
};

const scenarioLabels: Record<string, string> = {
  medical: "Medical Emergency",
  natural: "Natural Disaster",
  security: "Security Threat",
  custom: "Custom Scenario",
};

const PanicHistory = () => {
  const { user, loading: authLoading } = useAuth();
  const { isPremium, loading: entLoading } = useEntitlements(user, authLoading);
  const [history, setHistory] = useState<PanicActivation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadHistory = async () => {
      if (!user || !isPremium) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("panic_activations")
          .select("*")
          .eq("user_id", user.id)
          .order("activated_at", { ascending: false })
          .limit(50);

        if (error) {
          console.error("Error loading history:", error);
        } else {
          setHistory(data || []);
        }
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadHistory();
  }, [user, isPremium]);

  // Loading state
  if (authLoading || entLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Auth gate
  if (!user) {
    return <Navigate to="/auth" state={{ returnUrl: "/panic/history" }} replace />;
  }

  // Premium gate
  if (!isPremium) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="py-8 md:py-12">
          <PremiumLockedState title="Panic Button History" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="py-8 md:py-12">
        <div className="container mx-auto px-4 max-w-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-muted-foreground text-sm font-medium mb-4">
              <Clock className="h-4 w-4" />
              History
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
              Panic Button History
            </h1>
            <p className="text-muted-foreground">View past activations and test runs.</p>
          </div>

          {/* History List */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertCircle className="h-5 w-5 text-muted-foreground" />
                Activation Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-12">
                  <Shield className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground mb-2">No activations yet</p>
                  <p className="text-sm text-muted-foreground">
                    When you activate the panic button, it will be logged here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((item) => {
                    const config = statusConfig[item.status] || statusConfig.pending;
                    const StatusIcon = config.icon;

                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              item.is_test ? "bg-amber-100" : "bg-muted"
                            }`}
                          >
                            {item.is_test ? (
                              <FlaskConical className="h-5 w-5 text-amber-600" />
                            ) : (
                              <StatusIcon className={`h-5 w-5 ${config.color}`} />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              {scenarioLabels[item.scenario_type] || item.scenario_type}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(item.activated_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.is_test && (
                            <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                              Test
                            </span>
                          )}
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              item.status === "cancelled"
                                ? "bg-muted text-muted-foreground"
                                : item.status === "confirmed" || item.status === "completed"
                                ? "bg-primary/10 text-primary"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {config.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
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
            <Link to="/panic/test">
              <Button variant="ghost">Test Mode</Button>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PanicHistory;

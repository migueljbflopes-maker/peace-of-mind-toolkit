import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, Users, Bell, ChevronRight, Plus, Trash2, Clock, Send, Lock } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePanicSetup, ScenarioType } from "@/hooks/usePanicSetup";
import { useEntitlements } from "@/hooks/useEntitlements";
import { useAuth } from "@/hooks/useAuth";
import { PremiumLockedState } from "@/components/PremiumLockedState";
import { Skeleton } from "@/components/ui/skeleton";

const SCENARIO_OPTIONS: { type: ScenarioType; label: string; description: string }[] = [
  { type: "medical", label: "Medical Emergency", description: "Health crisis requiring immediate help" },
  { type: "natural", label: "Natural Disaster", description: "Earthquake, flood, fire, etc." },
  { type: "security", label: "Security Threat", description: "Personal safety concern" },
  { type: "custom", label: "Custom Scenario", description: "Define your own trigger" },
];

const PanicSetup = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isPremium, loading: entLoading } = useEntitlements();
  const {
    contacts,
    scenarios,
    checkInConfig,
    isLoading,
    isSaving,
    maxContacts,
    addContact,
    updateContact,
    removeContact,
    toggleScenario,
    setScenarioContacts,
    setCheckInConfig,
    save,
  } = usePanicSetup();

  const [customLabel, setCustomLabel] = useState("");
  const [activationMode, setActivationMode] = useState<"direct" | "checkin">("direct");

  // Sync custom label with scenario data
  useEffect(() => {
    const customScenario = scenarios.find((s) => s.scenario_type === "custom");
    if (customScenario?.custom_label) {
      setCustomLabel(customScenario.custom_label);
    }
  }, [scenarios]);

  // Sync activation mode with check-in config
  useEffect(() => {
    setActivationMode(checkInConfig.enabled ? "checkin" : "direct");
  }, [checkInConfig.enabled]);

  const getScenarioEnabled = (type: ScenarioType) => {
    return scenarios.find((s) => s.scenario_type === type)?.enabled ?? false;
  };

  const getScenarioContacts = (type: ScenarioType) => {
    return scenarios.find((s) => s.scenario_type === type)?.contact_ids ?? [];
  };

  const handleSave = async () => {
    const success = await save();
    if (success) {
      navigate("/panic/test");
    }
  };

  // Show login prompt if not logged in (FIRST)
  if (!authLoading && !user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="py-8 md:py-12">
          <div className="container mx-auto px-4 max-w-2xl text-center">
            <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Login Required</h1>
            <p className="text-muted-foreground mb-6">
              Please log in to configure your Panic Button.
            </p>
            <Link to="/login">
              <Button variant="cta">Log In</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Show premium locked state if not premium (SECOND)
  if (!entLoading && !isPremium) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="py-8 md:py-12">
          <div className="container mx-auto px-4 max-w-2xl">
            <PremiumLockedState title="Panic Button" />
          </div>
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
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/10 text-destructive text-sm font-medium mb-4">
              <AlertCircle className="h-4 w-4" />
              Panic Button Setup
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
              Configure Your Emergency Response
            </h1>
            <p className="text-muted-foreground">
              Define contacts, scenarios, and how alerts are triggered.
            </p>
          </div>

          {isLoading ? (
            <div className="space-y-6">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : (
            <>
              {/* Step 1: Emergency Contacts */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="h-5 w-5 text-primary" />
                    Emergency Contacts
                  </CardTitle>
                  <CardDescription>
                    Add up to {maxContacts} trusted contacts who will be notified in an emergency.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {contacts.map((contact, index) => (
                    <div key={index} className="p-4 rounded-lg border border-border bg-muted/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">
                          Contact {index + 1}
                        </span>
                        {contacts.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeContact(index)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <div className="grid gap-3">
                        <div>
                          <Label htmlFor={`name-${index}`} className="text-sm">
                            Name *
                          </Label>
                          <Input
                            id={`name-${index}`}
                            placeholder="John Smith"
                            value={contact.name}
                            onChange={(e) => updateContact(index, { name: e.target.value })}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor={`phone-${index}`} className="text-sm">
                              Phone
                            </Label>
                            <Input
                              id={`phone-${index}`}
                              placeholder="+1 555-0123"
                              value={contact.phone}
                              onChange={(e) => updateContact(index, { phone: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`email-${index}`} className="text-sm">
                              Email
                            </Label>
                            <Input
                              id={`email-${index}`}
                              type="email"
                              placeholder="john@example.com"
                              value={contact.email}
                              onChange={(e) => updateContact(index, { email: e.target.value })}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {contacts.length < maxContacts && (
                    <Button variant="outline" onClick={addContact} className="w-full gap-2">
                      <Plus className="h-4 w-4" />
                      Add Contact ({contacts.length}/{maxContacts})
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Step 2: Scenarios */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Bell className="h-5 w-5 text-primary" />
                    Emergency Scenarios
                  </CardTitle>
                  <CardDescription>
                    Choose which scenarios trigger alerts and which contacts to notify for each.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {SCENARIO_OPTIONS.map((option) => {
                    const isEnabled = getScenarioEnabled(option.type);
                    const selectedContacts = getScenarioContacts(option.type);

                    return (
                      <div
                        key={option.type}
                        className={`p-4 rounded-lg border transition-colors ${
                          isEnabled ? "border-primary/50 bg-primary/5" : "border-border bg-muted/30"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            id={option.type}
                            checked={isEnabled}
                            onCheckedChange={(checked) => {
                              toggleScenario(
                                option.type,
                                !!checked,
                                option.type === "custom" ? customLabel : undefined
                              );
                            }}
                          />
                          <div className="flex-1 space-y-2">
                            <Label htmlFor={option.type} className="cursor-pointer font-medium">
                              {option.label}
                            </Label>
                            <p className="text-sm text-muted-foreground">{option.description}</p>

                            {option.type === "custom" && isEnabled && (
                              <Input
                                placeholder="e.g., Power outage > 24h"
                                value={customLabel}
                                onChange={(e) => {
                                  setCustomLabel(e.target.value);
                                  toggleScenario("custom", true, e.target.value);
                                }}
                                className="mt-2"
                              />
                            )}

                            {isEnabled && contacts.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-border/50">
                                <Label className="text-xs text-muted-foreground mb-2 block">
                                  Contacts to notify:
                                </Label>
                                <div className="flex flex-wrap gap-2">
                                  {contacts.map((contact, idx) =>
                                    contact.name ? (
                                      <label
                                        key={idx}
                                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm cursor-pointer transition-colors ${
                                          selectedContacts.includes(contact.id || `temp-${idx}`)
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-muted hover:bg-muted/80"
                                        }`}
                                      >
                                        <input
                                          type="checkbox"
                                          className="sr-only"
                                          checked={selectedContacts.includes(contact.id || `temp-${idx}`)}
                                          onChange={(e) => {
                                            const contactId = contact.id || `temp-${idx}`;
                                            const newContacts = e.target.checked
                                              ? [...selectedContacts, contactId]
                                              : selectedContacts.filter((id) => id !== contactId);
                                            setScenarioContacts(option.type, newContacts);
                                          }}
                                        />
                                        {contact.name}
                                      </label>
                                    ) : null
                                  )}
                                </div>
                                {selectedContacts.length === 0 && (
                                  <p className="text-xs text-amber-600 mt-1">
                                    Select contacts or all saved contacts will be notified
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Step 3: Activation Mode */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Clock className="h-5 w-5 text-primary" />
                    Activation Mode
                  </CardTitle>
                  <CardDescription>
                    Choose how the panic button is triggered.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Direct Send */}
                  <div
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      activationMode === "direct"
                        ? "border-primary/50 bg-primary/5"
                        : "border-border bg-muted/30"
                    }`}
                    onClick={() => {
                      setActivationMode("direct");
                      setCheckInConfig({ ...checkInConfig, enabled: false });
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-4 h-4 rounded-full border-2 mt-0.5 ${
                          activationMode === "direct"
                            ? "border-primary bg-primary"
                            : "border-muted-foreground"
                        }`}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Send className="h-4 w-4" />
                          <span className="font-medium">Direct Send</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Manually activate the panic button when you need help. Hold for 3 seconds, then 5 seconds to cancel.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Check-in Mode */}
                  <div
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      activationMode === "checkin"
                        ? "border-primary/50 bg-primary/5"
                        : "border-border bg-muted/30"
                    }`}
                    onClick={() => {
                      setActivationMode("checkin");
                      setCheckInConfig({ ...checkInConfig, enabled: true });
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-4 h-4 rounded-full border-2 mt-0.5 ${
                          activationMode === "checkin"
                            ? "border-primary bg-primary"
                            : "border-muted-foreground"
                        }`}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span className="font-medium">Dead Man's Switch</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            Coming Soon
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Auto-alert contacts if you don't check in within the set interval.
                        </p>

                        {activationMode === "checkin" && (
                          <div className="mt-3 pt-3 border-t border-border/50">
                            <Label className="text-sm">Check-in Interval</Label>
                            <Select
                              value={String(checkInConfig.interval_hours)}
                              onValueChange={(v) =>
                                setCheckInConfig({ ...checkInConfig, interval_hours: Number(v) })
                              }
                              disabled
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="12">Every 12 hours</SelectItem>
                                <SelectItem value="24">Every 24 hours</SelectItem>
                                <SelectItem value="48">Every 48 hours</SelectItem>
                                <SelectItem value="72">Every 72 hours</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="cta"
                  className="flex-1 gap-2"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save & Continue"}
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Link to="/panic/test" className="flex-1">
                  <Button variant="outline" className="w-full">
                    Test Mode
                  </Button>
                </Link>
              </div>

              <p className="text-xs text-muted-foreground text-center mt-6">
                Your contacts will only be notified when you manually activate the panic button
                or miss a check-in (if enabled).
              </p>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PanicSetup;

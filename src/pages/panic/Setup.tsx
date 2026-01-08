import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, Users, Bell, ChevronRight, Plus, Trash2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

const PanicSetup = () => {
  const [contacts, setContacts] = useState([{ name: "", phone: "", email: "" }]);
  const [scenarios, setScenarios] = useState({
    medical: true,
    natural: false,
    security: false,
    custom: "",
  });

  const addContact = () => {
    setContacts([...contacts, { name: "", phone: "", email: "" }]);
  };

  const removeContact = (index: number) => {
    setContacts(contacts.filter((_, i) => i !== index));
  };

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
              Define scenarios and contacts. Takes about 5 minutes.
            </p>
          </div>

          {/* Step 1: Emergency Contacts */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-primary" />
                Emergency Contacts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {contacts.map((contact, index) => (
                <div key={index} className="p-4 rounded-lg border border-border bg-muted/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">Contact {index + 1}</span>
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
                      <Label htmlFor={`name-${index}`} className="text-sm">Name</Label>
                      <Input
                        id={`name-${index}`}
                        placeholder="John Smith"
                        value={contact.name}
                        onChange={(e) => {
                          const updated = [...contacts];
                          updated[index].name = e.target.value;
                          setContacts(updated);
                        }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor={`phone-${index}`} className="text-sm">Phone</Label>
                        <Input
                          id={`phone-${index}`}
                          placeholder="+1 555-0123"
                          value={contact.phone}
                          onChange={(e) => {
                            const updated = [...contacts];
                            updated[index].phone = e.target.value;
                            setContacts(updated);
                          }}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`email-${index}`} className="text-sm">Email</Label>
                        <Input
                          id={`email-${index}`}
                          type="email"
                          placeholder="john@example.com"
                          value={contact.email}
                          onChange={(e) => {
                            const updated = [...contacts];
                            updated[index].email = e.target.value;
                            setContacts(updated);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <Button variant="outline" onClick={addContact} className="w-full gap-2">
                <Plus className="h-4 w-4" />
                Add Another Contact
              </Button>
            </CardContent>
          </Card>

          {/* Step 2: Scenarios */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bell className="h-5 w-5 text-primary" />
                Emergency Scenarios
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Select which scenarios will trigger the panic button.
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="medical"
                    checked={scenarios.medical}
                    onCheckedChange={(checked) => setScenarios({ ...scenarios, medical: !!checked })}
                  />
                  <Label htmlFor="medical" className="cursor-pointer">
                    Medical Emergency
                  </Label>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="natural"
                    checked={scenarios.natural}
                    onCheckedChange={(checked) => setScenarios({ ...scenarios, natural: !!checked })}
                  />
                  <Label htmlFor="natural" className="cursor-pointer">
                    Natural Disaster
                  </Label>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="security"
                    checked={scenarios.security}
                    onCheckedChange={(checked) => setScenarios({ ...scenarios, security: !!checked })}
                  />
                  <Label htmlFor="security" className="cursor-pointer">
                    Security Threat
                  </Label>
                </div>
                <div>
                  <Label htmlFor="custom" className="text-sm text-muted-foreground">Custom scenario</Label>
                  <Input
                    id="custom"
                    placeholder="e.g., Power outage > 24h"
                    value={scenarios.custom}
                    onChange={(e) => setScenarios({ ...scenarios, custom: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="cta" className="flex-1 gap-2">
              Save & Continue
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Link to="/panic/test" className="flex-1">
              <Button variant="outline" className="w-full">
                Test Mode
              </Button>
            </Link>
          </div>

          <p className="text-xs text-muted-foreground text-center mt-6">
            Your contacts will only be notified when you manually activate the panic button.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PanicSetup;

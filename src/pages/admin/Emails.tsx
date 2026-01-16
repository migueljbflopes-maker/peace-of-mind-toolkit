import { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Check, Loader2, Mail, Clock, Send, Eye, Trash2, RefreshCw } from "lucide-react";
import { format } from "date-fns";

interface EmailTemplate {
  id: string;
  template_type: string;
  subject: string;
  html_content: string;
  is_active: boolean;
  updated_at: string;
  created_at: string;
}

interface ScheduledEmail {
  id: string;
  email: string;
  template_type: string;
  send_at: string;
  status: string;
  created_at: string;
}

interface SentEmail {
  id: string;
  email: string;
  template_type: string;
  sent_at: string;
  source: string;
}

type SaveStatus = "idle" | "saving" | "saved";

export default function AdminEmails() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [scheduled, setScheduled] = useState<ScheduledEmail[]>([]);
  const [sent, setSent] = useState<SentEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<Record<string, SaveStatus>>({});
  const [previewTemplate, setPreviewTemplate] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [templatesRes, scheduledRes, sentRes] = await Promise.all([
        supabase.from("email_templates").select("*").order("template_type"),
        supabase.from("scheduled_emails").select("*").eq("status", "pending").order("send_at"),
        supabase.from("emails_sent").select("*").order("sent_at", { ascending: false }).limit(50),
      ]);

      if (templatesRes.data) setTemplates(templatesRes.data);
      if (scheduledRes.data) setScheduled(scheduledRes.data);
      if (sentRes.data) setSent(sentRes.data);
    } catch (error) {
      console.error("Error fetching email data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateTemplate = useCallback(
    async (id: string, field: "subject" | "html_content" | "is_active", value: string | boolean) => {
      setSaveStatus((prev) => ({ ...prev, [id]: "saving" }));

      const { error } = await supabase
        .from("email_templates")
        .update({ [field]: value })
        .eq("id", id);

      if (error) {
        toast({
          title: "Error saving",
          description: error.message,
          variant: "destructive",
        });
        setSaveStatus((prev) => ({ ...prev, [id]: "idle" }));
        return;
      }

      setTemplates((prev) =>
        prev.map((t) => (t.id === id ? { ...t, [field]: value, updated_at: new Date().toISOString() } : t))
      );

      setSaveStatus((prev) => ({ ...prev, [id]: "saved" }));
      setTimeout(() => setSaveStatus((prev) => ({ ...prev, [id]: "idle" })), 2000);
    },
    [toast]
  );

  const debouncedUpdate = useCallback(
    (() => {
      const timers: Record<string, NodeJS.Timeout> = {};
      return (id: string, field: "subject" | "html_content", value: string) => {
        if (timers[`${id}-${field}`]) clearTimeout(timers[`${id}-${field}`]);
        timers[`${id}-${field}`] = setTimeout(() => {
          updateTemplate(id, field, value);
        }, 1500);
      };
    })(),
    [updateTemplate]
  );

  const handleFieldChange = (id: string, field: "subject" | "html_content", value: string) => {
    setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)));
    setSaveStatus((prev) => ({ ...prev, [id]: "saving" }));
    debouncedUpdate(id, field, value);
  };

  const cancelScheduledEmail = async (id: string) => {
    const { error } = await supabase.from("scheduled_emails").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setScheduled((prev) => prev.filter((s) => s.id !== id));
    toast({ title: "Cancelled", description: "Scheduled email was cancelled." });
  };

  const formatTemplateType = (type: string) => {
    return type
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  const getPreviewHtml = (template: EmailTemplate) => {
    return template.html_content
      .replace(/\{\{BASE_URL\}\}/g, "https://am-i-ready.com")
      .replace(/\{\{CTA_URL\}\}/g, "https://am-i-ready.com/dashboard")
      .replace(/\{\{CTA_TEXT\}\}/g, "Get Started")
      .replace(/\{\{BILLING_SECTION\}\}/g, "")
      .replace(/\{\{AMOUNT\}\}/g, "€49.00")
      .replace(/\{\{DATE\}\}/g, format(new Date(), "PPP"))
      .replace(/\{\{YEAR\}\}/g, new Date().getFullYear().toString());
  };

  return (
    <AdminLayout title="Email Management">
      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList>
          <TabsTrigger value="templates" className="gap-2">
            <Mail className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="gap-2">
            <Clock className="h-4 w-4" />
            Scheduled ({scheduled.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <Send className="h-4 w-4" />
            Sent History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            templates.map((template) => (
              <Card key={template.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-lg">{formatTemplateType(template.template_type)}</CardTitle>
                    <Badge variant={template.is_active ? "default" : "secondary"}>
                      {template.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`active-${template.id}`} className="text-sm text-muted-foreground">
                        Active
                      </Label>
                      <Switch
                        id={`active-${template.id}`}
                        checked={template.is_active}
                        onCheckedChange={(checked) => updateTemplate(template.id, "is_active", checked)}
                      />
                    </div>
                    {saveStatus[template.id] === "saving" && (
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" /> Saving...
                      </span>
                    )}
                    {saveStatus[template.id] === "saved" && (
                      <span className="flex items-center gap-1 text-sm text-green-600">
                        <Check className="h-3 w-3" /> Saved
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor={`subject-${template.id}`}>Subject</Label>
                    <Input
                      id={`subject-${template.id}`}
                      value={template.subject}
                      onChange={(e) => handleFieldChange(template.id, "subject", e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`html-${template.id}`}>HTML Content</Label>
                      <Textarea
                        id={`html-${template.id}`}
                        value={template.html_content}
                        onChange={(e) => handleFieldChange(template.id, "html_content", e.target.value)}
                        className="font-mono text-xs h-[400px] resize-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Preview</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPreviewTemplate(previewTemplate === template.id ? null : template.id)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          {previewTemplate === template.id ? "Hide" : "Show"} Full Preview
                        </Button>
                      </div>
                      <div className="border rounded-lg overflow-hidden bg-white h-[400px]">
                        <iframe
                          srcDoc={getPreviewHtml(template)}
                          className="w-full h-full"
                          title={`Preview ${template.template_type}`}
                        />
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Last updated: {format(new Date(template.updated_at), "PPP 'at' p")}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="scheduled" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
          {scheduled.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No scheduled emails pending.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <table className="w-full">
                  <thead className="border-b">
                    <tr className="text-left text-sm text-muted-foreground">
                      <th className="p-4">Email</th>
                      <th className="p-4">Template</th>
                      <th className="p-4">Scheduled For</th>
                      <th className="p-4">Created</th>
                      <th className="p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scheduled.map((item) => (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="p-4 font-medium">{item.email}</td>
                        <td className="p-4">
                          <Badge variant="outline">{formatTemplateType(item.template_type)}</Badge>
                        </td>
                        <td className="p-4 text-sm">{format(new Date(item.send_at), "PPP 'at' p")}</td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {format(new Date(item.created_at), "PPP")}
                        </td>
                        <td className="p-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => cancelScheduledEmail(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
          {sent.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Send className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No emails sent yet.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <table className="w-full">
                  <thead className="border-b">
                    <tr className="text-left text-sm text-muted-foreground">
                      <th className="p-4">Email</th>
                      <th className="p-4">Template</th>
                      <th className="p-4">Sent At</th>
                      <th className="p-4">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sent.map((item) => (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="p-4 font-medium">{item.email}</td>
                        <td className="p-4">
                          <Badge variant="outline">{formatTemplateType(item.template_type)}</Badge>
                        </td>
                        <td className="p-4 text-sm">
                          {item.sent_at ? format(new Date(item.sent_at), "PPP 'at' p") : "—"}
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">{item.source || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}

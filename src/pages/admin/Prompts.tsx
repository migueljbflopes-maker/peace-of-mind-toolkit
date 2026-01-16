import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  Brain, 
  RefreshCw, 
  ChevronDown, 
  ChevronRight, 
  Check, 
  Loader2,
  Settings,
  MessageSquare,
  Globe
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface AIPrompt {
  id: string;
  prompt_key: string;
  feature_name: string;
  prompt_type: string;
  content: string;
  locale: string;
  description: string | null;
  is_active: boolean;
  updated_at: string;
  updated_by: string | null;
}

interface RateConfig {
  id: string;
  feature: string;
  max_requests: number;
  window_minutes: number;
  is_active: boolean;
  updated_at: string;
}

type SaveStatus = "idle" | "saving" | "saved";

export default function AdminPrompts() {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const navigate = useNavigate();
  
  const [prompts, setPrompts] = useState<AIPrompt[]>([]);
  const [rateConfigs, setRateConfigs] = useState<RateConfig[]>([]);
  const [loadingPrompts, setLoadingPrompts] = useState(true);
  const [loadingRates, setLoadingRates] = useState(true);
  const [expandedFeatures, setExpandedFeatures] = useState<Set<string>>(new Set());
  const [saveStatuses, setSaveStatuses] = useState<Record<string, SaveStatus>>({});
  const [rateSaveStatuses, setRateSaveStatuses] = useState<Record<string, SaveStatus>>({});
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, NodeJS.Timeout>>({});

  // Fetch prompts
  const fetchPrompts = useCallback(async () => {
    setLoadingPrompts(true);
    const { data, error } = await supabase
      .from("ai_prompts")
      .select("*")
      .order("feature_name", { ascending: true })
      .order("prompt_type", { ascending: true });

    if (error) {
      toast.error("Failed to load prompts");
      console.error(error);
    } else {
      setPrompts(data || []);
      // Expand first feature by default
      if (data && data.length > 0) {
        const features = [...new Set(data.map(p => p.feature_name))];
        setExpandedFeatures(new Set([features[0]]));
      }
    }
    setLoadingPrompts(false);
  }, []);

  // Fetch rate configs
  const fetchRateConfigs = useCallback(async () => {
    setLoadingRates(true);
    const { data, error } = await supabase
      .from("ai_rate_config")
      .select("*")
      .order("feature", { ascending: true });

    if (error) {
      toast.error("Failed to load rate configs");
      console.error(error);
    } else {
      setRateConfigs(data || []);
    }
    setLoadingRates(false);
  }, []);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate("/");
      return;
    }
    if (isAdmin) {
      fetchPrompts();
      fetchRateConfigs();
    }
  }, [isAdmin, adminLoading, navigate, fetchPrompts, fetchRateConfigs]);

  // Debounced save for prompts
  const savePrompt = useCallback(async (promptId: string, updates: Partial<AIPrompt>) => {
    setSaveStatuses(prev => ({ ...prev, [promptId]: "saving" }));
    
    const { error } = await supabase
      .from("ai_prompts")
      .update(updates)
      .eq("id", promptId);

    if (error) {
      toast.error("Failed to save prompt");
      console.error(error);
      setSaveStatuses(prev => ({ ...prev, [promptId]: "idle" }));
    } else {
      setSaveStatuses(prev => ({ ...prev, [promptId]: "saved" }));
      // Reset to idle after 2 seconds
      setTimeout(() => {
        setSaveStatuses(prev => ({ ...prev, [promptId]: "idle" }));
      }, 2000);
    }
  }, []);

  // Handle content change with debounce
  const handleContentChange = useCallback((promptId: string, content: string) => {
    // Update local state immediately
    setPrompts(prev => prev.map(p => 
      p.id === promptId ? { ...p, content } : p
    ));

    // Clear existing timeout
    if (pendingUpdates[promptId]) {
      clearTimeout(pendingUpdates[promptId]);
    }

    // Set new debounced save
    const timeout = setTimeout(() => {
      savePrompt(promptId, { content });
    }, 2000);

    setPendingUpdates(prev => ({ ...prev, [promptId]: timeout }));
  }, [pendingUpdates, savePrompt]);

  // Toggle active status
  const handleToggleActive = useCallback(async (promptId: string, isActive: boolean) => {
    setPrompts(prev => prev.map(p => 
      p.id === promptId ? { ...p, is_active: isActive } : p
    ));
    await savePrompt(promptId, { is_active: isActive });
  }, [savePrompt]);

  // Save rate config
  const saveRateConfig = useCallback(async (configId: string, updates: Partial<RateConfig>) => {
    setRateSaveStatuses(prev => ({ ...prev, [configId]: "saving" }));
    
    const { error } = await supabase
      .from("ai_rate_config")
      .update(updates)
      .eq("id", configId);

    if (error) {
      toast.error("Failed to save rate config");
      console.error(error);
      setRateSaveStatuses(prev => ({ ...prev, [configId]: "idle" }));
    } else {
      setRateSaveStatuses(prev => ({ ...prev, [configId]: "saved" }));
      setTimeout(() => {
        setRateSaveStatuses(prev => ({ ...prev, [configId]: "idle" }));
      }, 2000);
    }
  }, []);

  // Handle rate config change
  const handleRateConfigChange = useCallback((configId: string, field: keyof RateConfig, value: number | boolean) => {
    setRateConfigs(prev => prev.map(c => 
      c.id === configId ? { ...c, [field]: value } : c
    ));
    saveRateConfig(configId, { [field]: value });
  }, [saveRateConfig]);

  // Toggle feature expansion
  const toggleFeature = (feature: string) => {
    setExpandedFeatures(prev => {
      const next = new Set(prev);
      if (next.has(feature)) {
        next.delete(feature);
      } else {
        next.add(feature);
      }
      return next;
    });
  };

  // Group prompts by feature
  const promptsByFeature = prompts.reduce((acc, prompt) => {
    if (!acc[prompt.feature_name]) {
      acc[prompt.feature_name] = [];
    }
    acc[prompt.feature_name].push(prompt);
    return acc;
  }, {} as Record<string, AIPrompt[]>);

  // Get locale badge variant
  const getLocaleBadge = (locale: string) => {
    switch (locale) {
      case "en": return <Badge variant="outline" className="text-xs">EN</Badge>;
      case "pt": return <Badge variant="outline" className="text-xs">PT</Badge>;
      default: return <Badge variant="secondary" className="text-xs"><Globe className="h-3 w-3 mr-1" />All</Badge>;
    }
  };

  // Get save status indicator
  const getSaveIndicator = (status: SaveStatus) => {
    switch (status) {
      case "saving": return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
      case "saved": return <Check className="h-4 w-4 text-green-500" />;
      default: return null;
    }
  };

  if (adminLoading) {
    return (
      <AdminLayout title="AI Prompts">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AdminLayout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <AdminLayout title="AI Prompts & Rate Limits">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Brain className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">AI Prompts & Rate Limits</h1>
          </div>
        </div>

        <Tabs defaultValue="prompts" className="w-full">
          <TabsList>
            <TabsTrigger value="prompts" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Prompts
            </TabsTrigger>
            <TabsTrigger value="rates" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Rate Limits
            </TabsTrigger>
          </TabsList>

          {/* Prompts Tab */}
          <TabsContent value="prompts" className="space-y-4">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={fetchPrompts} disabled={loadingPrompts}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loadingPrompts ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>

            {loadingPrompts ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(promptsByFeature).map(([feature, featurePrompts]) => (
                  <Card key={feature}>
                    <Collapsible 
                      open={expandedFeatures.has(feature)} 
                      onOpenChange={() => toggleFeature(feature)}
                    >
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {expandedFeatures.has(feature) ? (
                                <ChevronDown className="h-5 w-5 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                              )}
                              <CardTitle className="text-lg">{feature}</CardTitle>
                              <Badge variant="secondary">{featurePrompts.length} prompts</Badge>
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent>
                        <CardContent className="space-y-6 pt-0">
                          {featurePrompts.map((prompt) => (
                            <div key={prompt.id} className="border rounded-lg p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{prompt.prompt_type} prompt</span>
                                  {getLocaleBadge(prompt.locale)}
                                  {!prompt.is_active && (
                                    <Badge variant="destructive" className="text-xs">Inactive</Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-3">
                                  {getSaveIndicator(saveStatuses[prompt.id] || "idle")}
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">Active</span>
                                    <Switch
                                      checked={prompt.is_active}
                                      onCheckedChange={(checked) => handleToggleActive(prompt.id, checked)}
                                    />
                                  </div>
                                </div>
                              </div>

                              {prompt.description && (
                                <p className="text-sm text-muted-foreground">{prompt.description}</p>
                              )}

                              <Textarea
                                value={prompt.content}
                                onChange={(e) => handleContentChange(prompt.id, e.target.value)}
                                className="min-h-[200px] font-mono text-sm"
                                placeholder="Enter prompt content..."
                              />

                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>{prompt.content.length.toLocaleString()} chars</span>
                                <span>
                                  Updated {formatDistanceToNow(new Date(prompt.updated_at), { addSuffix: true })}
                                </span>
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Rate Limits Tab */}
          <TabsContent value="rates" className="space-y-4">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={fetchRateConfigs} disabled={loadingRates}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loadingRates ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>

            {loadingRates ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Rate Limit Configuration</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Configure request limits per user for each AI feature
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-medium">Feature</th>
                          <th className="text-left py-3 px-4 font-medium">Max Requests</th>
                          <th className="text-left py-3 px-4 font-medium">Window (minutes)</th>
                          <th className="text-left py-3 px-4 font-medium">Active</th>
                          <th className="text-left py-3 px-4 font-medium w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {rateConfigs.map((config) => (
                          <tr key={config.id} className="border-b last:border-0">
                            <td className="py-3 px-4">
                              <code className="bg-muted px-2 py-1 rounded text-sm">
                                {config.feature}
                              </code>
                            </td>
                            <td className="py-3 px-4">
                              <Input
                                type="number"
                                value={config.max_requests}
                                onChange={(e) => handleRateConfigChange(config.id, "max_requests", parseInt(e.target.value) || 0)}
                                className="w-24"
                                min={1}
                              />
                            </td>
                            <td className="py-3 px-4">
                              <Input
                                type="number"
                                value={config.window_minutes}
                                onChange={(e) => handleRateConfigChange(config.id, "window_minutes", parseInt(e.target.value) || 0)}
                                className="w-24"
                                min={1}
                              />
                            </td>
                            <td className="py-3 px-4">
                              <Switch
                                checked={config.is_active}
                                onCheckedChange={(checked) => handleRateConfigChange(config.id, "is_active", checked)}
                              />
                            </td>
                            <td className="py-3 px-4">
                              {getSaveIndicator(rateSaveStatuses[config.id] || "idle")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-medium mb-2">How it works</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Each user can make up to <strong>Max Requests</strong> within the <strong>Window</strong> period</li>
                      <li>• After exceeding the limit, users receive a 429 error until the window resets</li>
                      <li>• Disable rate limiting for a feature by toggling <strong>Active</strong> off</li>
                      <li>• Changes take effect immediately on the next request</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

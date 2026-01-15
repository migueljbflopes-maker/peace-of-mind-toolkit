import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  MessageSquare, 
  Send, 
  Loader2, 
  Clock, 
  CheckCircle2, 
  ArrowLeft, 
  Shield,
  AlertCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useEntitlements } from "@/hooks/useEntitlements";
import { useLocale } from "@/i18n/useLocale";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { PremiumLockedState } from "@/components/PremiumLockedState";
import { format } from "date-fns";

type QuestionCategory = "security" | "medical" | "supplies" | "evacuation" | "general";

interface ExpertQuestion {
  id: string;
  category: QuestionCategory;
  question: string;
  answer: string | null;
  status: "pending" | "answered";
  created_at: string;
  answered_at: string | null;
}

const MAX_QUESTIONS = 3;

const categoryLabels: Record<QuestionCategory, { en: string; pt: string }> = {
  security: { en: "Security", pt: "Segurança" },
  medical: { en: "Medical", pt: "Médico" },
  supplies: { en: "Supplies", pt: "Suprimentos" },
  evacuation: { en: "Evacuation", pt: "Evacuação" },
  general: { en: "General", pt: "Geral" },
};

export default function ExpertPage() {
  const { user, loading: authLoading } = useAuth();
  const { isPremium, loading: entLoading } = useEntitlements();
  const { locale, t } = useLocale();
  const loading = authLoading || entLoading;
  
  const [questions, setQuestions] = useState<ExpertQuestion[]>([]);
  const [fetchingQuestions, setFetchingQuestions] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [category, setCategory] = useState<QuestionCategory>("general");
  const [questionText, setQuestionText] = useState("");

  const remainingQuestions = MAX_QUESTIONS - questions.length;
  const canAsk = remainingQuestions > 0;
  
  const pendingQuestions = questions.filter(q => q.status === "pending");
  const answeredQuestions = questions.filter(q => q.status === "answered");

  // Fetch existing questions
  useEffect(() => {
    if (!user?.id) return;
    
    const fetchQuestions = async () => {
      try {
        const { data, error } = await supabase
          .from("expert_questions")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setQuestions((data as ExpertQuestion[]) || []);
      } catch (err) {
        console.error("Failed to fetch questions:", err);
      } finally {
        setFetchingQuestions(false);
      }
    };

    fetchQuestions();
  }, [user?.id]);

  const handleSubmit = async () => {
    if (!questionText.trim() || !canAsk || !user?.id) return;

    setSubmitting(true);
    try {
      // Insert the question with status "pending" - NO immediate AI response
      const { data: insertData, error: insertError } = await supabase
        .from("expert_questions")
        .insert({
          user_id: user.id,
          category,
          question: questionText.trim(),
          status: "pending",
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Add to local state
      setQuestions((prev) => [insertData as ExpertQuestion, ...prev]);
      setQuestionText("");
      setCategory("general");

      toast.success(locale === "pt" ? "Pergunta submetida!" : "Question submitted!", {
        description: locale === "pt" 
          ? "Será respondida em até 24 horas." 
          : "You'll receive an answer within 24 hours.",
      });
    } catch (err: any) {
      console.error("Failed to submit question:", err);
      toast.error(locale === "pt" ? "Falha ao submeter pergunta" : "Failed to submit question", {
        description: err.message || (locale === "pt" ? "Tenta novamente." : "Please try again."),
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  // Auth gate
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center py-12 px-4">
          <Card className="w-full max-w-md text-center">
            <CardHeader>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>{t.dashboard.loginRequired}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">{t.dashboard.loginPrompt}</p>
              <Link to="/login?return_url=/premium/expert">
                <Button className="w-full">{t.dashboard.loginButton}</Button>
              </Link>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // Premium gate
  if (!isPremium) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 container-wide section-padding py-8">
          <PremiumLockedState 
            title={locale === "pt" ? "Especialista em Segurança" : "Security Expert"}
          />
        </main>
        <Footer />
      </div>
    );
  }

  const getCategoryLabel = (cat: QuestionCategory) => 
    locale === "pt" ? categoryLabels[cat].pt : categoryLabels[cat].en;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-1 container-wide section-padding py-8">
        {/* Header with back button */}
        <div className="mb-6">
          <Link to="/dashboard">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {locale === "pt" ? "Voltar ao Dashboard" : "Back to Dashboard"}
            </Button>
          </Link>
          
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <MessageSquare className="h-6 w-6 text-primary" />
                {locale === "pt" ? "Pergunte a um Especialista" : "Ask a Security Expert"}
              </h1>
              <p className="text-muted-foreground mt-1">
                {locale === "pt" 
                  ? "Obtenha respostas personalizadas de especialistas em segurança e preparação."
                  : "Get personalized answers from security and preparedness experts."}
              </p>
            </div>
            <Badge variant={canAsk ? "secondary" : "outline"} className="text-sm">
              {remainingQuestions}/{MAX_QUESTIONS} {locale === "pt" ? "perguntas restantes" : "questions left"}
            </Badge>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left Column: Question Form */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {locale === "pt" ? "Nova Pergunta" : "New Question"}
                </CardTitle>
                <CardDescription>
                  {locale === "pt" 
                    ? "Selecione uma categoria e escreva a sua pergunta."
                    : "Select a category and write your question."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {canAsk ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        {locale === "pt" ? "Categoria" : "Category"}
                      </label>
                      <Select value={category} onValueChange={(v) => setCategory(v as QuestionCategory)}>
                        <SelectTrigger>
                          <SelectValue placeholder={locale === "pt" ? "Selecionar categoria" : "Select category"} />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(categoryLabels) as QuestionCategory[]).map((key) => (
                            <SelectItem key={key} value={key}>
                              {getCategoryLabel(key)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        {locale === "pt" ? "Sua pergunta" : "Your question"}
                      </label>
                      <Textarea
                        placeholder={locale === "pt" 
                          ? "Ex: Como criar um kit de emergência para uma família de 4 pessoas?"
                          : "e.g., How do I create a 72-hour emergency kit for a family of 4?"}
                        value={questionText}
                        onChange={(e) => setQuestionText(e.target.value)}
                        rows={4}
                        className="resize-none"
                      />
                    </div>

                    <Button
                      onClick={handleSubmit}
                      disabled={!questionText.trim() || submitting}
                      className="w-full"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {locale === "pt" ? "A submeter..." : "Submitting..."}
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          {locale === "pt" ? "Enviar Pergunta" : "Submit Question"}
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-6">
                    <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">
                      {locale === "pt" 
                        ? `Utilizaste todas as ${MAX_QUESTIONS} perguntas disponíveis.`
                        : `You've used all ${MAX_QUESTIONS} available questions.`}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 24h Notice */}
            <Alert className="bg-amber-50 border-amber-200">
              <Clock className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                {locale === "pt" 
                  ? "As perguntas são respondidas por especialistas em até 24 horas. Receberás uma notificação quando a resposta estiver disponível."
                  : "Questions are answered by experts within 24 hours. You'll be notified when your answer is ready."}
              </AlertDescription>
            </Alert>
          </div>

          {/* Right Column: Question History */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {locale === "pt" ? "As Suas Perguntas" : "Your Questions"}
                </CardTitle>
                <CardDescription>
                  {locale === "pt" 
                    ? "Histórico de perguntas e respostas."
                    : "History of your questions and answers."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {fetchingQuestions ? (
                  <div className="space-y-3">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                  </div>
                ) : questions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p>{locale === "pt" ? "Ainda não fizeste perguntas." : "You haven't asked any questions yet."}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Pending Questions */}
                    {pendingQuestions.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          {locale === "pt" ? "Aguardando Resposta" : "Awaiting Response"}
                        </h4>
                        {pendingQuestions.map((q) => (
                          <div key={q.id} className="p-4 rounded-lg border border-amber-200 bg-amber-50/50 space-y-2">
                            <div className="flex items-start gap-2">
                              <Badge variant="outline" className="shrink-0 text-xs bg-background">
                                {getCategoryLabel(q.category)}
                              </Badge>
                              <p className="text-sm font-medium flex-1">{q.question}</p>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-amber-700">
                              <Clock className="h-3 w-3" />
                              <span>
                                {locale === "pt" 
                                  ? `Submetida em ${format(new Date(q.created_at), "dd/MM/yyyy 'às' HH:mm")}`
                                  : `Submitted on ${format(new Date(q.created_at), "MMM d, yyyy 'at' HH:mm")}`}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Answered Questions */}
                    {answeredQuestions.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                          {locale === "pt" ? "Respondidas" : "Answered"}
                        </h4>
                        {answeredQuestions.map((q) => (
                          <div key={q.id} className="p-4 rounded-lg bg-muted/50 space-y-3">
                            <div className="flex items-start gap-2">
                              <Badge variant="outline" className="shrink-0 text-xs">
                                {getCategoryLabel(q.category)}
                              </Badge>
                              <p className="text-sm font-medium flex-1">{q.question}</p>
                            </div>
                            
                            {q.answer && (
                              <div className="flex items-start gap-2 pl-2 border-l-2 border-primary/30">
                                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{q.answer}</p>
                                  {q.answered_at && (
                                    <p className="text-xs text-muted-foreground/70">
                                      {locale === "pt" 
                                        ? `Respondida em ${format(new Date(q.answered_at), "dd/MM/yyyy")}`
                                        : `Answered on ${format(new Date(q.answered_at), "MMM d, yyyy")}`}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

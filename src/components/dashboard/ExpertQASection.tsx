import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, ExternalLink, Loader2, Clock, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLocale } from "@/i18n/useLocale";

interface ExpertQuestion {
  id: string;
  category: string;
  question: string;
  answer: string | null;
  status: "pending" | "answered";
  created_at: string;
}

const MAX_QUESTIONS = 3;

export function ExpertQASection({ userId }: { userId: string }) {
  const { locale } = useLocale();
  const [questions, setQuestions] = useState<ExpertQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  const remainingQuestions = MAX_QUESTIONS - questions.length;
  const latestQuestion = questions[0];
  const pendingCount = questions.filter(q => q.status === "pending").length;
  const answeredCount = questions.filter(q => q.status === "answered").length;

  // Fetch existing questions
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const { data, error } = await supabase
          .from("expert_questions")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setQuestions((data as ExpertQuestion[]) || []);
      } catch (err) {
        console.error("Failed to fetch questions:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [userId]);

  const handleOpenExpert = () => {
    window.open('/premium/expert', '_blank');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            {locale === "pt" ? "Especialista em Segurança" : "Security Expert"}
          </CardTitle>
          <Badge variant={remainingQuestions > 0 ? "secondary" : "outline"}>
            {remainingQuestions}/{MAX_QUESTIONS} {locale === "pt" ? "restantes" : "left"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Summary */}
        <div className="flex gap-4 text-sm">
          {pendingCount > 0 && (
            <div className="flex items-center gap-1.5 text-amber-600">
              <Clock className="h-4 w-4" />
              <span>{pendingCount} {locale === "pt" ? "pendente(s)" : "pending"}</span>
            </div>
          )}
          {answeredCount > 0 && (
            <div className="flex items-center gap-1.5 text-primary">
              <CheckCircle2 className="h-4 w-4" />
              <span>{answeredCount} {locale === "pt" ? "respondida(s)" : "answered"}</span>
            </div>
          )}
        </div>

        {/* Latest Question Preview */}
        {latestQuestion && (
          <div className="p-3 rounded-lg bg-muted/50 space-y-2">
            <p className="text-sm font-medium line-clamp-2">{latestQuestion.question}</p>
            {latestQuestion.status === "answered" && latestQuestion.answer ? (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {latestQuestion.answer}
              </p>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-amber-600">
                <Clock className="h-3 w-3" />
                <span>{locale === "pt" ? "Aguardando resposta..." : "Awaiting response..."}</span>
              </div>
            )}
          </div>
        )}

        {/* Open Expert Page Button */}
        <Button onClick={handleOpenExpert} variant="outline" className="w-full">
          <ExternalLink className="h-4 w-4 mr-2" />
          {questions.length > 0 
            ? (locale === "pt" ? "Ver Todas / Fazer Pergunta" : "View All / Ask Question")
            : (locale === "pt" ? "Fazer Pergunta" : "Ask a Question")
          }
        </Button>
      </CardContent>
    </Card>
  );
}

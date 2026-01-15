import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, Loader2, Clock, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

const categoryLabels: Record<QuestionCategory, string> = {
  security: "Security",
  medical: "Medical",
  supplies: "Supplies",
  evacuation: "Evacuation",
  general: "General",
};

export function ExpertQASection({ userId }: { userId: string }) {
  const [questions, setQuestions] = useState<ExpertQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [category, setCategory] = useState<QuestionCategory>("general");
  const [questionText, setQuestionText] = useState("");

  const remainingQuestions = MAX_QUESTIONS - questions.length;
  const canAsk = remainingQuestions > 0;

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

  const handleSubmit = async () => {
    if (!questionText.trim() || !canAsk) return;

    setSubmitting(true);
    try {
      // Insert the question
      const { data: insertData, error: insertError } = await supabase
        .from("expert_questions")
        .insert({
          user_id: userId,
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

      toast.success("Question submitted!", {
        description: "Our expert will respond shortly.",
      });

      // Call the expert-chat edge function to get an AI response
      const { data: chatData, error: chatError } = await supabase.functions.invoke("expert-chat", {
        body: {
          question_id: insertData.id,
          category,
          question: questionText.trim(),
        },
      });

      if (chatError) {
        console.error("Expert chat error:", chatError);
        // Don't show error toast - the question is saved, just waiting for response
        return;
      }

      if (chatData?.answer) {
        // Update local state with the answer
        setQuestions((prev) =>
          prev.map((q) =>
            q.id === insertData.id
              ? { ...q, answer: chatData.answer, status: "answered" as const, answered_at: new Date().toISOString() }
              : q
          )
        );
      }
    } catch (err: any) {
      console.error("Failed to submit question:", err);
      toast.error("Failed to submit question", {
        description: err.message || "Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
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
            Ask a Security Expert
          </CardTitle>
          <Badge variant={canAsk ? "secondary" : "outline"}>
            {remainingQuestions}/{MAX_QUESTIONS} questions left
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Question Form */}
        {canAsk ? (
          <div className="space-y-3">
            <Select value={category} onValueChange={(v) => setCategory(v as QuestionCategory)}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(categoryLabels) as QuestionCategory[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {categoryLabels[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Textarea
              placeholder="Type your question here... (e.g., 'How do I create a 72-hour emergency kit for a family of 4?')"
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              rows={3}
              className="resize-none"
            />

            <Button
              onClick={handleSubmit}
              disabled={!questionText.trim() || submitting}
              className="w-full"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Ask Expert
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            <p className="text-sm">You've used all {MAX_QUESTIONS} expert questions.</p>
          </div>
        )}

        {/* Questions List */}
        {questions.length > 0 && (
          <div className="space-y-3 pt-2 border-t">
            <h4 className="text-sm font-medium text-muted-foreground">Your Questions</h4>
            {questions.map((q) => (
              <div key={q.id} className="p-3 rounded-lg bg-muted/50 space-y-2">
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="shrink-0 text-xs">
                    {categoryLabels[q.category]}
                  </Badge>
                  <p className="text-sm font-medium flex-1">{q.question}</p>
                </div>
                
                {q.status === "answered" && q.answer ? (
                  <div className="flex items-start gap-2 pl-2 border-l-2 border-primary/30">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground">{q.answer}</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>Awaiting expert response...</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

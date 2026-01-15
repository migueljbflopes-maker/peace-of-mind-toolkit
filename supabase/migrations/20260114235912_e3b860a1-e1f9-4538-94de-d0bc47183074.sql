-- Create expert_questions table for Premium Q&A feature
CREATE TABLE public.expert_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('security', 'medical', 'supplies', 'evacuation', 'general')),
  question TEXT NOT NULL,
  answer TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'answered')),
  created_at TIMESTAMPTZ DEFAULT now(),
  answered_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.expert_questions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only premium users can access their own questions
CREATE POLICY "Users can view their own questions"
ON public.expert_questions
FOR SELECT
USING (auth.uid() = user_id AND public.is_premium(auth.uid()));

CREATE POLICY "Premium users can insert questions (max 3)"
ON public.expert_questions
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND public.is_premium(auth.uid())
  AND (SELECT COUNT(*) FROM public.expert_questions WHERE user_id = auth.uid()) < 3
);

-- Index for efficient queries
CREATE INDEX idx_expert_questions_user_status ON public.expert_questions(user_id, status);
CREATE INDEX idx_expert_questions_pending ON public.expert_questions(status) WHERE status = 'pending';
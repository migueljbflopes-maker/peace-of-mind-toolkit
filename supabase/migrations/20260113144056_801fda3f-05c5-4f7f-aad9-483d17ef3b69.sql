-- Add AI insights column to risk_assessments table
ALTER TABLE public.risk_assessments 
ADD COLUMN IF NOT EXISTS ai_insights JSONB;
-- Create function to update timestamps (if not exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create onboarding_state table
CREATE TABLE public.onboarding_state (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  step INT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.onboarding_state ENABLE ROW LEVEL SECURITY;

-- Users can read their own onboarding state
CREATE POLICY "Users can view their own onboarding state"
ON public.onboarding_state
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own onboarding state
CREATE POLICY "Users can insert their own onboarding state"
ON public.onboarding_state
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own onboarding state
CREATE POLICY "Users can update their own onboarding state"
ON public.onboarding_state
FOR UPDATE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_onboarding_state_updated_at
BEFORE UPDATE ON public.onboarding_state
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
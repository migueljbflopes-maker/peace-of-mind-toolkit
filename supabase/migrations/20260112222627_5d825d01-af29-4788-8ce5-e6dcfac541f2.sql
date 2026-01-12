-- Dead Man's Switch check-in monitoring tables

-- Table to track active check-in monitoring sessions
CREATE TABLE public.checkin_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  scenario_type public.panic_scenario_type NOT NULL,
  interval_hours INTEGER NOT NULL DEFAULT 24,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  paused_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended', 'triggered')),
  next_checkin_due TIMESTAMP WITH TIME ZONE NOT NULL,
  missed_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table to track individual check-in reminders sent
CREATE TABLE public.checkin_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.checkin_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reminder_number INTEGER NOT NULL, -- 1, 2, or 3
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE,
  token TEXT NOT NULL UNIQUE, -- Unique token for responding to check-in
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'responded', 'expired'))
);

-- Enable RLS
ALTER TABLE public.checkin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkin_reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for checkin_sessions
CREATE POLICY "Users can view their own check-in sessions"
ON public.checkin_sessions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own check-in sessions"
ON public.checkin_sessions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own check-in sessions"
ON public.checkin_sessions
FOR UPDATE
USING (auth.uid() = user_id);

-- RLS Policies for checkin_reminders
CREATE POLICY "Users can view their own check-in reminders"
ON public.checkin_reminders
FOR SELECT
USING (auth.uid() = user_id);

-- Service role can manage reminders (for cron job)
CREATE POLICY "Service role can manage reminders"
ON public.checkin_reminders
FOR ALL
USING (true)
WITH CHECK (true);

-- Add updated_at trigger
CREATE TRIGGER update_checkin_sessions_updated_at
BEFORE UPDATE ON public.checkin_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for efficient cron job queries
CREATE INDEX idx_checkin_sessions_active ON public.checkin_sessions (status, next_checkin_due) WHERE status = 'active';
CREATE INDEX idx_checkin_reminders_pending ON public.checkin_reminders (status, expires_at) WHERE status = 'pending';
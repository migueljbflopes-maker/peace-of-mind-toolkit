-- Fix RLS policies for checkin tables

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Service role can manage reminders" ON public.checkin_reminders;

-- Add proper user-scoped policies for checkin_reminders
CREATE POLICY "Users can insert their own check-in reminders"
ON public.checkin_reminders
FOR INSERT
WITH CHECK (auth.uid() = user_id AND is_premium(auth.uid()));

CREATE POLICY "Users can update their own check-in reminders"
ON public.checkin_reminders
FOR UPDATE
USING (auth.uid() = user_id AND is_premium(auth.uid()));

CREATE POLICY "Users can delete their own check-in reminders"
ON public.checkin_reminders
FOR DELETE
USING (auth.uid() = user_id AND is_premium(auth.uid()));

-- Update select policy for checkin_reminders to require premium
DROP POLICY IF EXISTS "Users can view their own check-in reminders" ON public.checkin_reminders;
CREATE POLICY "Users can view their own check-in reminders"
ON public.checkin_reminders
FOR SELECT
USING (auth.uid() = user_id AND is_premium(auth.uid()));

-- Update checkin_sessions policies to require premium
DROP POLICY IF EXISTS "Users can view their own check-in sessions" ON public.checkin_sessions;
DROP POLICY IF EXISTS "Users can create their own check-in sessions" ON public.checkin_sessions;
DROP POLICY IF EXISTS "Users can update their own check-in sessions" ON public.checkin_sessions;

CREATE POLICY "checkin_sessions_select_premium"
ON public.checkin_sessions
FOR SELECT
USING (auth.uid() = user_id AND is_premium(auth.uid()));

CREATE POLICY "checkin_sessions_insert_premium"
ON public.checkin_sessions
FOR INSERT
WITH CHECK (auth.uid() = user_id AND is_premium(auth.uid()));

CREATE POLICY "checkin_sessions_update_premium"
ON public.checkin_sessions
FOR UPDATE
USING (auth.uid() = user_id AND is_premium(auth.uid()));

CREATE POLICY "checkin_sessions_delete_premium"
ON public.checkin_sessions
FOR DELETE
USING (auth.uid() = user_id AND is_premium(auth.uid()));
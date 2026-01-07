-- Add is_public column to weekly_briefings
ALTER TABLE public.weekly_briefings 
ADD COLUMN is_public boolean NOT NULL DEFAULT false;

-- Backfill: mark existing curated briefings (user_id IS NULL) as public
UPDATE public.weekly_briefings 
SET is_public = true 
WHERE user_id IS NULL;

-- Drop the old permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can read briefings" ON public.weekly_briefings;

-- Create SELECT policy for public curated briefings
CREATE POLICY "Public can read curated weekly briefings"
ON public.weekly_briefings
FOR SELECT
USING (is_public = true);

-- Create SELECT policy for users to read their own briefings
CREATE POLICY "Users can read their own weekly briefings"
ON public.weekly_briefings
FOR SELECT
USING (auth.uid() = user_id);

-- Drop and recreate INSERT policy to prevent users from creating public briefings
DROP POLICY IF EXISTS "Users can create their own briefings" ON public.weekly_briefings;

CREATE POLICY "Users can create their own briefings"
ON public.weekly_briefings
FOR INSERT
WITH CHECK (auth.uid() = user_id AND is_public = false);

-- Add UPDATE policy for owner-only
CREATE POLICY "Users can update their own briefings"
ON public.weekly_briefings
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id AND is_public = false);

-- Add DELETE policy for owner-only
CREATE POLICY "Users can delete their own briefings"
ON public.weekly_briefings
FOR DELETE
USING (auth.uid() = user_id);
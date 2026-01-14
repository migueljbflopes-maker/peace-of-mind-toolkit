-- Create table to track sent emails and prevent duplicates
CREATE TABLE IF NOT EXISTS public.emails_sent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  template_type text NOT NULL,
  sent_at timestamptz DEFAULT now(),
  stripe_event_id text,
  source text,
  UNIQUE(email, template_type)
);

-- Add indexes for performance
CREATE INDEX idx_emails_sent_email ON public.emails_sent(email);
CREATE INDEX idx_emails_sent_template ON public.emails_sent(template_type);

-- Enable RLS
ALTER TABLE public.emails_sent ENABLE ROW LEVEL SECURITY;

-- Only service role can access this table (no user access needed)
CREATE POLICY "Service role only" ON public.emails_sent
  FOR ALL USING (false);
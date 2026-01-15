-- Create scheduled_emails table for delayed email sending
CREATE TABLE public.scheduled_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  template_type TEXT NOT NULL,
  template_data JSONB DEFAULT '{}',
  send_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  stripe_event_id TEXT
);

-- Enable RLS (service role only - no public access)
ALTER TABLE public.scheduled_emails ENABLE ROW LEVEL SECURITY;

-- Index for efficient queue processing
CREATE INDEX idx_scheduled_emails_pending ON public.scheduled_emails (send_at) WHERE status = 'pending';

-- Schedule cron job to process email queue every hour
SELECT cron.schedule(
  'send-scheduled-emails-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/send-scheduled-emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
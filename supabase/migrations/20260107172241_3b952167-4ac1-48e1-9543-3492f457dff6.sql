-- Add 'kind' and 'trust_level' columns to news_sources
ALTER TABLE public.news_sources ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'signals';
ALTER TABLE public.news_sources ADD COLUMN IF NOT EXISTS trust_level text NOT NULL DEFAULT 'high';

-- Add check constraints
ALTER TABLE public.news_sources DROP CONSTRAINT IF EXISTS news_sources_kind_check;
ALTER TABLE public.news_sources ADD CONSTRAINT news_sources_kind_check CHECK (kind IN ('signals', 'context', 'headline_index'));

ALTER TABLE public.news_sources DROP CONSTRAINT IF EXISTS news_sources_trust_level_check;
ALTER TABLE public.news_sources ADD CONSTRAINT news_sources_trust_level_check CHECK (trust_level IN ('high', 'medium'));

-- Add new columns to news_items
ALTER TABLE public.news_items ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'signals';
ALTER TABLE public.news_items ADD COLUMN IF NOT EXISTS domain text;
ALTER TABLE public.news_items ADD COLUMN IF NOT EXISTS language text DEFAULT 'en';

-- Add check constraint for kind
ALTER TABLE public.news_items DROP CONSTRAINT IF EXISTS news_items_kind_check;
ALTER TABLE public.news_items ADD CONSTRAINT news_items_kind_check CHECK (kind IN ('signals', 'context', 'headline'));

-- Change severity to text type with check constraint (if it's an enum, we need to handle this)
ALTER TABLE public.news_items DROP CONSTRAINT IF EXISTS news_items_severity_check;
ALTER TABLE public.news_items ALTER COLUMN severity TYPE text USING severity::text;
ALTER TABLE public.news_items ADD CONSTRAINT news_items_severity_check CHECK (severity IS NULL OR severity IN ('major', 'moderate'));

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS news_items_kind_idx ON public.news_items (kind);
CREATE INDEX IF NOT EXISTS news_items_domain_idx ON public.news_items (domain);
CREATE INDEX IF NOT EXISTS news_items_fetched_at_idx ON public.news_items (fetched_at DESC);
CREATE INDEX IF NOT EXISTS news_items_published_at_idx ON public.news_items (published_at DESC);
CREATE INDEX IF NOT EXISTS news_items_topics_gin ON public.news_items USING gin (topics);
CREATE INDEX IF NOT EXISTS news_items_region_idx ON public.news_items (region);

-- Add last_updated_at to weekly_briefings
ALTER TABLE public.weekly_briefings ADD COLUMN IF NOT EXISTS last_updated_at timestamptz;

-- Add last_seen_at to alert_preferences
ALTER TABLE public.alert_preferences ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

-- Create news_domain_allowlist table
CREATE TABLE IF NOT EXISTS public.news_domain_allowlist (
  domain text PRIMARY KEY,
  label text,
  region_scope text NOT NULL DEFAULT 'Global',
  enabled boolean NOT NULL DEFAULT true
);

-- Enable RLS on allowlist
ALTER TABLE public.news_domain_allowlist ENABLE ROW LEVEL SECURITY;

-- Create policy for public read
DROP POLICY IF EXISTS "public read allowlist" ON public.news_domain_allowlist;
CREATE POLICY "public read allowlist" ON public.news_domain_allowlist FOR SELECT USING (true);

-- Update existing sources with correct 'kind' values
UPDATE public.news_sources SET kind = 'signals' WHERE id IN ('gdacs', 'usgs-earthquake', 'meteoalarm');
UPDATE public.news_sources SET kind = 'context' WHERE id IN ('reliefweb', 'ecdc');

-- Add index for weekly_briefings user lookup
CREATE INDEX IF NOT EXISTS weekly_briefings_user_idx ON public.weekly_briefings (user_id, created_at DESC);
-- Create enum for news source types
CREATE TYPE public.news_source_type AS ENUM ('rss', 'api');

-- Create enum for severity levels
CREATE TYPE public.news_severity AS ENUM ('major', 'moderate');

-- Create enum for alert frequency
CREATE TYPE public.alert_frequency AS ENUM ('immediate', 'daily', 'weekly');

-- Create news_sources table
CREATE TABLE public.news_sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type news_source_type NOT NULL,
  region_scope TEXT,
  topics TEXT[] DEFAULT '{}',
  base_url TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on news_sources (public read, admin write)
ALTER TABLE public.news_sources ENABLE ROW LEVEL SECURITY;

-- Anyone can read news sources
CREATE POLICY "Anyone can read news sources"
  ON public.news_sources
  FOR SELECT
  USING (true);

-- Create news_items table
CREATE TABLE public.news_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id TEXT REFERENCES public.news_sources(id) ON DELETE CASCADE,
  published_at TIMESTAMP WITH TIME ZONE,
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  title TEXT NOT NULL,
  summary TEXT,
  url TEXT,
  region TEXT,
  topics TEXT[] DEFAULT '{}',
  severity news_severity DEFAULT 'moderate',
  dedupe_key TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on news_items (public read)
ALTER TABLE public.news_items ENABLE ROW LEVEL SECURITY;

-- Anyone can read news items
CREATE POLICY "Anyone can read news items"
  ON public.news_items
  FOR SELECT
  USING (true);

-- Create weekly_briefings table
CREATE TABLE public.weekly_briefings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  filters JSONB DEFAULT '{}',
  item_ids UUID[] DEFAULT '{}',
  rendered_summary TEXT
);

-- Enable RLS on weekly_briefings
ALTER TABLE public.weekly_briefings ENABLE ROW LEVEL SECURITY;

-- Anyone can read briefings (including anonymous)
CREATE POLICY "Anyone can read briefings"
  ON public.weekly_briefings
  FOR SELECT
  USING (true);

-- Only authenticated users can create their own briefings
CREATE POLICY "Users can create their own briefings"
  ON public.weekly_briefings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create alert_preferences table (Premium feature)
CREATE TABLE public.alert_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  topics TEXT[] DEFAULT '{}',
  regions TEXT[] DEFAULT '{}',
  severity_threshold news_severity DEFAULT 'major',
  frequency alert_frequency DEFAULT 'daily',
  quiet_hours JSONB DEFAULT '{}',
  enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on alert_preferences
ALTER TABLE public.alert_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only read their own preferences
CREATE POLICY "Users can read their own alert preferences"
  ON public.alert_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own preferences
CREATE POLICY "Users can insert their own alert preferences"
  ON public.alert_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "Users can update their own alert preferences"
  ON public.alert_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_news_items_published_at ON public.news_items(published_at DESC);
CREATE INDEX idx_news_items_severity ON public.news_items(severity);
CREATE INDEX idx_news_items_topics ON public.news_items USING GIN(topics);
CREATE INDEX idx_news_items_region ON public.news_items(region);
CREATE INDEX idx_news_items_source_id ON public.news_items(source_id);

-- Insert initial news sources
INSERT INTO public.news_sources (id, name, type, region_scope, topics, base_url, enabled) VALUES
  ('gdacs', 'GDACS', 'api', 'Global', ARRAY['Natural Hazards'], 'https://www.gdacs.org/xml/rss.xml', true),
  ('usgs-earthquake', 'USGS Earthquakes', 'api', 'Global', ARRAY['Natural Hazards'], 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson', true),
  ('reliefweb', 'ReliefWeb', 'api', 'Global', ARRAY['Conflict & Geopolitics', 'Natural Hazards', 'Public Health'], 'https://api.reliefweb.int/v1/reports', true),
  ('meteoalarm', 'MeteoAlarm', 'rss', 'Europe', ARRAY['Natural Hazards'], 'https://feeds.meteoalarm.org/feeds/meteoalarm-legacy-rss-eu', true),
  ('ecdc', 'ECDC', 'rss', 'Europe', ARRAY['Public Health'], 'https://www.ecdc.europa.eu/en/rss.xml', true);
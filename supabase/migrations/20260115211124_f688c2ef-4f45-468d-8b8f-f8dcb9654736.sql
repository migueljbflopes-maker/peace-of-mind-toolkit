
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table (separate from profiles per security best practices)
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Policy: anyone can check roles (needed for has_role function)
CREATE POLICY "user_roles_select_own" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Security definer function to check roles (bypasses RLS, prevents recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Convenience function for admin check
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

-- Page views table for analytics
CREATE TABLE public.page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path text NOT NULL,
  referrer text,
  user_agent text,
  session_id text,
  user_id uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

-- Anyone can insert page views (anonymous tracking)
CREATE POLICY "page_views_insert_anon" ON public.page_views
  FOR INSERT WITH CHECK (true);

-- Only admins can read page views
CREATE POLICY "page_views_select_admin" ON public.page_views
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Feature usage tracking
CREATE TABLE public.feature_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_name text NOT NULL,
  action text NOT NULL,
  user_id uuid,
  session_id text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.feature_usage ENABLE ROW LEVEL SECURITY;

-- Anyone can insert feature usage
CREATE POLICY "feature_usage_insert_anon" ON public.feature_usage
  FOR INSERT WITH CHECK (true);

-- Only admins can read feature usage
CREATE POLICY "feature_usage_select_admin" ON public.feature_usage
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Affiliate links table
CREATE TABLE public.affiliate_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL,
  market text NOT NULL DEFAULT 'US',
  affiliate_tag text NOT NULL,
  base_url text,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(product_id, market)
);

ALTER TABLE public.affiliate_links ENABLE ROW LEVEL SECURITY;

-- Anyone can read affiliate links (needed for product display)
CREATE POLICY "affiliate_links_select_public" ON public.affiliate_links
  FOR SELECT USING (true);

-- Only admins can modify affiliate links
CREATE POLICY "affiliate_links_insert_admin" ON public.affiliate_links
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "affiliate_links_update_admin" ON public.affiliate_links
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "affiliate_links_delete_admin" ON public.affiliate_links
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Create indexes for performance
CREATE INDEX idx_page_views_path ON public.page_views(path);
CREATE INDEX idx_page_views_created_at ON public.page_views(created_at);
CREATE INDEX idx_feature_usage_feature ON public.feature_usage(feature_name);
CREATE INDEX idx_feature_usage_created_at ON public.feature_usage(created_at);
CREATE INDEX idx_affiliate_links_product ON public.affiliate_links(product_id);

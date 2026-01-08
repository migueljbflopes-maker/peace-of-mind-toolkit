-- Create enum for panic scenario types
CREATE TYPE public.panic_scenario_type AS ENUM ('medical', 'natural', 'security', 'custom');

-- Create enum for activation status
CREATE TYPE public.panic_activation_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');

-- Create enum for notification status
CREATE TYPE public.panic_notification_status AS ENUM ('pending', 'sent', 'delivered', 'failed');

-- Create enum for notification channel
CREATE TYPE public.panic_notification_channel AS ENUM ('email', 'sms');

-- Table: panic_contacts
-- Stores emergency contacts for each user
CREATE TABLE public.panic_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  priority INTEGER NOT NULL DEFAULT 1,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table: panic_scenarios
-- Stores configured emergency scenarios
CREATE TABLE public.panic_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  scenario_type public.panic_scenario_type NOT NULL,
  custom_label TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  share_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, scenario_type)
);

-- Table: panic_activations
-- Log of each panic button activation
CREATE TABLE public.panic_activations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  scenario_type public.panic_scenario_type NOT NULL,
  status public.panic_activation_status NOT NULL DEFAULT 'pending',
  location_snapshot JSONB,
  shared_data JSONB,
  is_test BOOLEAN NOT NULL DEFAULT false,
  activated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  cancelled_at TIMESTAMP WITH TIME ZONE,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Table: panic_notifications
-- Status of each notification sent
CREATE TABLE public.panic_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activation_id UUID NOT NULL REFERENCES public.panic_activations(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.panic_contacts(id) ON DELETE CASCADE,
  channel public.panic_notification_channel NOT NULL,
  status public.panic_notification_status NOT NULL DEFAULT 'pending',
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on all tables
ALTER TABLE public.panic_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.panic_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.panic_activations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.panic_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for panic_contacts (premium only)
CREATE POLICY "panic_contacts_select_premium" ON public.panic_contacts
  FOR SELECT USING (auth.uid() = user_id AND is_premium(auth.uid()));

CREATE POLICY "panic_contacts_insert_premium" ON public.panic_contacts
  FOR INSERT WITH CHECK (auth.uid() = user_id AND is_premium(auth.uid()));

CREATE POLICY "panic_contacts_update_premium" ON public.panic_contacts
  FOR UPDATE USING (auth.uid() = user_id AND is_premium(auth.uid()))
  WITH CHECK (auth.uid() = user_id AND is_premium(auth.uid()));

CREATE POLICY "panic_contacts_delete_premium" ON public.panic_contacts
  FOR DELETE USING (auth.uid() = user_id AND is_premium(auth.uid()));

-- RLS Policies for panic_scenarios (premium only)
CREATE POLICY "panic_scenarios_select_premium" ON public.panic_scenarios
  FOR SELECT USING (auth.uid() = user_id AND is_premium(auth.uid()));

CREATE POLICY "panic_scenarios_insert_premium" ON public.panic_scenarios
  FOR INSERT WITH CHECK (auth.uid() = user_id AND is_premium(auth.uid()));

CREATE POLICY "panic_scenarios_update_premium" ON public.panic_scenarios
  FOR UPDATE USING (auth.uid() = user_id AND is_premium(auth.uid()))
  WITH CHECK (auth.uid() = user_id AND is_premium(auth.uid()));

CREATE POLICY "panic_scenarios_delete_premium" ON public.panic_scenarios
  FOR DELETE USING (auth.uid() = user_id AND is_premium(auth.uid()));

-- RLS Policies for panic_activations (premium only)
CREATE POLICY "panic_activations_select_premium" ON public.panic_activations
  FOR SELECT USING (auth.uid() = user_id AND is_premium(auth.uid()));

CREATE POLICY "panic_activations_insert_premium" ON public.panic_activations
  FOR INSERT WITH CHECK (auth.uid() = user_id AND is_premium(auth.uid()));

CREATE POLICY "panic_activations_update_premium" ON public.panic_activations
  FOR UPDATE USING (auth.uid() = user_id AND is_premium(auth.uid()))
  WITH CHECK (auth.uid() = user_id AND is_premium(auth.uid()));

CREATE POLICY "panic_activations_delete_premium" ON public.panic_activations
  FOR DELETE USING (auth.uid() = user_id AND is_premium(auth.uid()));

-- RLS Policies for panic_notifications (via activation ownership + premium)
CREATE POLICY "panic_notifications_select_premium" ON public.panic_notifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.panic_activations pa
      WHERE pa.id = activation_id
      AND pa.user_id = auth.uid()
      AND is_premium(auth.uid())
    )
  );

CREATE POLICY "panic_notifications_insert_premium" ON public.panic_notifications
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.panic_activations pa
      WHERE pa.id = activation_id
      AND pa.user_id = auth.uid()
      AND is_premium(auth.uid())
    )
  );

-- Create triggers for updated_at
CREATE TRIGGER update_panic_contacts_updated_at
  BEFORE UPDATE ON public.panic_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_panic_scenarios_updated_at
  BEFORE UPDATE ON public.panic_scenarios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_panic_contacts_user_id ON public.panic_contacts(user_id);
CREATE INDEX idx_panic_scenarios_user_id ON public.panic_scenarios(user_id);
CREATE INDEX idx_panic_activations_user_id ON public.panic_activations(user_id);
CREATE INDEX idx_panic_activations_status ON public.panic_activations(status);
CREATE INDEX idx_panic_notifications_activation_id ON public.panic_notifications(activation_id);
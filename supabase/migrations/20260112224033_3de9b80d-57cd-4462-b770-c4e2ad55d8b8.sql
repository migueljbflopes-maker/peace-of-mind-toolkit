-- Create premium_plans table for Plan Wizard 2.0
-- Stores wizard inputs and generated Plan A/B JSONs

CREATE TABLE public.premium_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Wizard inputs (Step 1-6)
  wizard_inputs JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Location context
  home_location JSONB DEFAULT NULL,
  
  -- Safe destinations for evacuation (Step 2)
  safe_locations JSONB DEFAULT '[]'::jsonb,
  
  -- Constraints and resources (Step 3)
  constraints JSONB DEFAULT '{}'::jsonb,
  
  -- Selected scenarios (Step 4)
  scenario_set TEXT[] DEFAULT '{}',
  
  -- Personal priorities (Step 5)
  priorities TEXT[] DEFAULT '{}',
  
  -- Communication preferences (Step 6)
  comms_config JSONB DEFAULT '{}'::jsonb,
  
  -- Generated plans (encrypted JSONB)
  plan_a_json JSONB DEFAULT NULL,
  plan_b_json JSONB DEFAULT NULL,
  
  -- Generation metadata
  last_generated_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  generation_version INTEGER DEFAULT 1,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft'
);

-- Enable RLS
ALTER TABLE public.premium_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only premium users can access their own plans
CREATE POLICY "Users can view their own premium plans"
ON public.premium_plans
FOR SELECT
USING (auth.uid() = user_id AND is_premium(auth.uid()));

CREATE POLICY "Users can create their own premium plans"
ON public.premium_plans
FOR INSERT
WITH CHECK (auth.uid() = user_id AND is_premium(auth.uid()));

CREATE POLICY "Users can update their own premium plans"
ON public.premium_plans
FOR UPDATE
USING (auth.uid() = user_id AND is_premium(auth.uid()));

CREATE POLICY "Users can delete their own premium plans"
ON public.premium_plans
FOR DELETE
USING (auth.uid() = user_id AND is_premium(auth.uid()));

-- Create index for user lookups
CREATE INDEX idx_premium_plans_user_id ON public.premium_plans(user_id);

-- Add updated_at trigger
CREATE TRIGGER update_premium_plans_updated_at
BEFORE UPDATE ON public.premium_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE public.premium_plans IS 'Stores Plan Wizard 2.0 inputs and generated Plan A/B data for premium users';
COMMENT ON COLUMN public.premium_plans.wizard_inputs IS 'All wizard step inputs as JSON';
COMMENT ON COLUMN public.premium_plans.scenario_set IS 'Selected emergency scenarios: war, flood, fire, earthquake, storm, blackout, civil_unrest, chemical';
COMMENT ON COLUMN public.premium_plans.safe_locations IS 'Array of safe destination objects: {label, address, type, priority}';
COMMENT ON COLUMN public.premium_plans.plan_a_json IS 'Generated Plan A (Shelter/Stay) as structured JSON';
COMMENT ON COLUMN public.premium_plans.plan_b_json IS 'Generated Plan B (Evacuate/Move) as structured JSON';
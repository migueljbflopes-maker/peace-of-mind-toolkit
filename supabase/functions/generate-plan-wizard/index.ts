import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getPrompt } from "../_shared/prompts.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PLAN_A_SCHEMA = {
  type: "object",
  required: ["overview", "triggers", "first_hour", "first_24h", "first_week", "checklists", "comms_plan", "meetup_points", "notes"],
  properties: {
    overview: { type: "string" },
    triggers: { type: "array", items: { type: "string" } },
    first_hour: { type: "array", items: { type: "string" } },
    first_24h: { type: "array", items: { type: "string" } },
    first_week: { type: "array", items: { type: "string" } },
    checklists: {
      type: "object",
      properties: {
        docs: { type: "array", items: { type: "string" } },
        meds: { type: "array", items: { type: "string" } },
        money: { type: "array", items: { type: "string" } },
        comms: { type: "array", items: { type: "string" } },
        gear: { type: "array", items: { type: "string" } },
        pets_kids: { type: "array", items: { type: "string" } },
        home: { type: "array", items: { type: "string" } },
      }
    },
    comms_plan: { type: "string" },
    meetup_points: {
      type: "object",
      properties: {
        primary: { type: "string" },
        secondary: { type: "string" }
      }
    },
    notes: { type: "string" }
  }
};

const PLAN_B_SCHEMA = {
  type: "object",
  required: ["overview", "triggers", "go_now_checklist", "routes", "destinations_ranked", "vehicle_plan", "no_go_zones", "comms_plan", "meetup_points", "notes"],
  properties: {
    overview: { type: "string" },
    triggers: { type: "array", items: { type: "string" } },
    go_now_checklist: { type: "array", items: { type: "string" } },
    routes: {
      type: "object",
      properties: {
        primary: { type: "string" },
        alt1: { type: "string" },
        alt2: { type: "string" },
        fallback: { type: "string" }
      }
    },
    destinations_ranked: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          reason: { type: "string" },
          priority: { type: "number" }
        }
      }
    },
    border_crossing_notes: { type: "string" },
    vehicle_plan: { type: "string" },
    no_go_zones: { type: "array", items: { type: "string" } },
    comms_plan: { type: "string" },
    meetup_points: {
      type: "object",
      properties: {
        primary: { type: "string" },
        secondary: { type: "string" }
      }
    },
    notes: { type: "string" }
  }
};

// Fallback system prompt
const FALLBACK_SYSTEM_PROMPT = `You are an emergency preparedness expert specializing in personal and family safety planning. Your role is to generate calm, practical, and actionable emergency plans.

Key guidelines:
- Be objective and actionable, not alarmist
- Never include weapons, violence, or illegal actions
- Encourage following local authorities' guidance
- Provide specific, contextual advice based on the user's location and circumstances
- Consider the user's household composition, mobility, and resources
- Generate strategic routes (directions/highways/zones to avoid) - NOT turn-by-turn navigation
- Include specific triggers for when to switch from Plan A to Plan B
- Provide exhaustive checklists organized by category`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Get auth token from request (optional - for rate limiting)
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    
    // Create admin client for DB operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // If authenticated, check rate limit
    if (authHeader) {
      const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      
      const { data: { user } } = await supabaseUser.auth.getUser();
      if (user) {
        userId = user.id;
        
        // Check rate limit
        const rateLimit = await checkRateLimit(supabaseAdmin, userId, "plan_wizard");
        if (!rateLimit.allowed) {
          console.log(`Rate limit exceeded for user ${userId} on plan_wizard`);
          return rateLimitResponse(rateLimit, corsHeaders);
        }
      }
    }

    const { wizard_inputs, locale = 'en' } = await req.json();
    
    if (!wizard_inputs) {
      return new Response(JSON.stringify({ error: 'Missing wizard_inputs' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Use OpenAI API directly
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      console.error('OPENAI_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const isPt = locale === 'pt';
    
    // Get system prompt from DB (with fallback)
    const systemPrompt = await getPrompt(supabaseAdmin, "plan_wizard_system", FALLBACK_SYSTEM_PROMPT);

    const contextSummary = JSON.stringify(wizard_inputs, null, 2);

    // Generate Plan A using OpenAI
    console.log('Generating Plan A with OpenAI...');
    const planAResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini-2025-04-14',
        max_completion_tokens: 1400,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate Plan A (Shelter in Place / Stay Home) for this context:\n${contextSummary}\n\nPlan A focuses on staying safely at home during disruptions. Include scenario-specific triggers that would indicate when to switch to Plan B, timelines (first hour, 24h, week), and practical checklists by category. Output in ${isPt ? 'Portuguese' : 'English'}. Be exhaustive and actionable.` }
        ],
        tools: [{
          type: 'function',
          function: { name: 'generate_plan_a', description: 'Generate shelter-in-place emergency plan', parameters: PLAN_A_SCHEMA }
        }],
        tool_choice: { type: 'function', function: { name: 'generate_plan_a' } },
      }),
    });

    if (!planAResponse.ok) {
      const err = await planAResponse.text();
      console.error('Plan A generation failed:', planAResponse.status, err);
      
      if (planAResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      if (planAResponse.status === 401) {
        return new Response(JSON.stringify({ error: 'Invalid API key. Please check configuration.' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      if (planAResponse.status === 503) {
        return new Response(JSON.stringify({ error: 'AI service temporarily unavailable. Please try again.' }), {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      return new Response(JSON.stringify({ error: 'Plan A generation failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const planAData = await planAResponse.json();
    const planAArgs = planAData.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const planA = planAArgs ? JSON.parse(planAArgs) : null;

    if (!planA) {
      console.error('Plan A parsing failed:', planAData);
      return new Response(JSON.stringify({ error: 'Failed to parse Plan A' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Generate Plan B using OpenAI
    console.log('Generating Plan B with OpenAI...');
    const planBResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini-2025-04-14',
        max_completion_tokens: 1400,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate Plan B (Evacuate / Leave) for this context:\n${contextSummary}\n\nPlan B focuses on leaving home safely. Include strategic routes based on the safe destinations provided (not turn-by-turn navigation), ranking of destinations with reasons, go-now checklist, triggers that indicate when Plan B should be activated, no-go zones to avoid, and border crossing notes if applicable. Output in ${isPt ? 'Portuguese' : 'English'}. Be exhaustive and actionable.` }
        ],
        tools: [{
          type: 'function',
          function: { name: 'generate_plan_b', description: 'Generate evacuation emergency plan', parameters: PLAN_B_SCHEMA }
        }],
        tool_choice: { type: 'function', function: { name: 'generate_plan_b' } },
      }),
    });

    if (!planBResponse.ok) {
      const err = await planBResponse.text();
      console.error('Plan B generation failed:', planBResponse.status, err);
      
      if (planBResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      if (planBResponse.status === 401) {
        return new Response(JSON.stringify({ error: 'Invalid API key. Please check configuration.' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      if (planBResponse.status === 503) {
        return new Response(JSON.stringify({ error: 'AI service temporarily unavailable. Please try again.' }), {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      return new Response(JSON.stringify({ error: 'Plan B generation failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const planBData = await planBResponse.json();
    const planBArgs = planBData.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const planB = planBArgs ? JSON.parse(planBArgs) : null;

    if (!planB) {
      console.error('Plan B parsing failed:', planBData);
      return new Response(JSON.stringify({ error: 'Failed to parse Plan B' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Plans generated successfully with OpenAI');

    return new Response(JSON.stringify({ plan_a: planA, plan_b: planB }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

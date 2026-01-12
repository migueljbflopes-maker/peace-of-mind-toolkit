import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { wizard_inputs, locale = 'en' } = await req.json();
    
    if (!wizard_inputs) {
      return new Response(JSON.stringify({ error: 'Missing wizard_inputs' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      console.error('OPENAI_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const isPt = locale === 'pt';
    const systemPrompt = `You are an emergency preparedness expert. Generate calm, practical, actionable emergency plans. Avoid fear language. Do not include weapons, violence, or illegal actions. Encourage following local authorities.`;

    const contextSummary = JSON.stringify(wizard_inputs, null, 2);

    // Generate Plan A
    console.log('Generating Plan A...');
    const planAResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini-2025-04-14',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate Plan A (Shelter in Place / Stay Home) for this context:\n${contextSummary}\n\nPlan A focuses on staying safely at home during disruptions. Include scenario-specific triggers, timelines (first hour, 24h, week), and practical checklists. Output in ${isPt ? 'Portuguese' : 'English'}. Be exhaustive and actionable.` }
        ],
        tools: [{
          type: 'function',
          function: { name: 'generate_plan_a', description: 'Generate shelter-in-place emergency plan', parameters: PLAN_A_SCHEMA }
        }],
        tool_choice: { type: 'function', function: { name: 'generate_plan_a' } },
        max_completion_tokens: 2000,
      }),
    });

    if (!planAResponse.ok) {
      const err = await planAResponse.text();
      console.error('Plan A generation failed:', err);
      return new Response(JSON.stringify({ error: 'Plan A generation failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const planAData = await planAResponse.json();
    const planAArgs = planAData.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const planA = planAArgs ? JSON.parse(planAArgs) : null;

    // Generate Plan B
    console.log('Generating Plan B...');
    const planBResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini-2025-04-14',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate Plan B (Evacuate / Leave) for this context:\n${contextSummary}\n\nPlan B focuses on leaving home safely. Include strategic routes (not turn-by-turn), safe destinations ranking, go-now checklist, and triggers to switch from Plan A to Plan B. Output in ${isPt ? 'Portuguese' : 'English'}. Be exhaustive and actionable.` }
        ],
        tools: [{
          type: 'function',
          function: { name: 'generate_plan_b', description: 'Generate evacuation emergency plan', parameters: PLAN_B_SCHEMA }
        }],
        tool_choice: { type: 'function', function: { name: 'generate_plan_b' } },
        max_completion_tokens: 2000,
      }),
    });

    if (!planBResponse.ok) {
      const err = await planBResponse.text();
      console.error('Plan B generation failed:', err);
      return new Response(JSON.stringify({ error: 'Plan B generation failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const planBData = await planBResponse.json();
    const planBArgs = planBData.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const planB = planBArgs ? JSON.parse(planBArgs) : null;

    console.log('Plans generated successfully');

    return new Response(JSON.stringify({ plan_a: planA, plan_b: planB }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

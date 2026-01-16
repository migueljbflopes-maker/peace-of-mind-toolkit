import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getLocalePrompt } from "../_shared/prompts.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rich plan draft JSON schema for structured output (tailored plans)
const PLAN_SCHEMA = {
  type: "object",
  required: [
    "planType", "locale", "title", "whyThisFitsYou", "topPrioritiesThisWeek",
    "triggers", "objectives", "homeSetup", "communications", "mobility",
    "pets", "essentialsGrabList", "stepsFirstHour", "stepsFirstDay", "checklists", "notes"
  ],
  properties: {
    planType: { type: "string", enum: ["A", "B"] },
    locale: { type: "string", enum: ["en", "pt"] },
    title: { type: "string" },
    whyThisFitsYou: { type: "string" },
    topPrioritiesThisWeek: { type: "array", items: { type: "string" }, minItems: 5, maxItems: 5 },
    triggers: { type: "array", items: { type: "string" }, minItems: 6, maxItems: 10 },
    objectives: { type: "array", items: { type: "string" }, minItems: 6, maxItems: 10 },
    homeSetup: {
      type: "object",
      required: ["power", "water", "cooking", "communicationsBackup", "documentsHandling"],
      properties: {
        power: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 8 },
        water: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 8 },
        cooking: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 7 },
        communicationsBackup: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 6 },
        documentsHandling: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 6 }
      },
      additionalProperties: false
    },
    communications: {
      type: "object",
      required: ["checkInRule", "outOfAreaContactRole", "familyMeetingRule"],
      properties: {
        checkInRule: { type: "string" },
        outOfAreaContactRole: { type: "string" },
        familyMeetingRule: { type: "string" }
      },
      additionalProperties: false
    },
    mobility: {
      type: "object",
      required: ["constraints", "transport", "meetingPoints", "routeNotes"],
      properties: {
        constraints: { type: "string" },
        transport: { type: "string" },
        meetingPoints: {
          type: "object",
          required: ["primary", "secondary"],
          properties: {
            primary: { type: "string" },
            secondary: { type: "string" }
          },
          additionalProperties: false
        },
        routeNotes: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 6 }
      },
      additionalProperties: false
    },
    pets: {
      type: "object",
      required: ["hasPets", "petCareChecklist"],
      properties: {
        hasPets: { type: "boolean" },
        petCareChecklist: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 8 }
      },
      additionalProperties: false
    },
    essentialsGrabList: { type: "array", items: { type: "string" }, minItems: 12, maxItems: 18 },
    stepsFirstHour: { type: "array", items: { type: "string" }, minItems: 8, maxItems: 12 },
    stepsFirstDay: { type: "array", items: { type: "string" }, minItems: 8, maxItems: 12 },
    checklists: {
      type: "object",
      required: ["beforeDisruption", "duringDisruption", "afterDisruption"],
      properties: {
        beforeDisruption: { type: "array", items: { type: "string" }, minItems: 6, maxItems: 10 },
        duringDisruption: { type: "array", items: { type: "string" }, minItems: 6, maxItems: 10 },
        afterDisruption: { type: "array", items: { type: "string" }, minItems: 6, maxItems: 10 }
      },
      additionalProperties: false
    },
    notes: { type: "string" }
  },
  additionalProperties: false
};

// Premium Insights schema for risk assessment explanations
const INSIGHTS_SCHEMA = {
  type: "object",
  required: ["explanation", "top_priorities", "watchlist"],
  properties: {
    explanation: { type: "string" },
    top_priorities: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 3 },
    watchlist: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 3 }
  },
  additionalProperties: false
};

// Input schema type for plan generation
interface PlanGenerationInput {
  locale: 'en' | 'pt';
  planType: 'A' | 'B';
  location?: {
    country?: string;
    city?: string;
    postalCode?: string;
    dwellingType?: 'apartment' | 'house';
    floorLevel?: 'ground' | '1-3' | '4+';
    hasElevator?: boolean;
    hasGarden?: boolean;
  };
  household?: {
    adults?: number;
    kids?: number;
    pets?: number;
    petTypes?: string[];
    mobilityConstraints?: string[];
    primaryLanguage?: string;
  };
  homeReality?: {
    internetReliance?: 'low' | 'medium' | 'high';
    powerOutagePreparedness?: 'low' | 'medium' | 'high';
    waterStorage?: 'none' | 'some' | 'good';
    cookingOptions?: string[];
    heatingType?: 'district' | 'gas' | 'electric' | 'none';
    vehicleAccess?: 'none' | 'car' | 'bike_only' | 'multiple';
    cashOnHandLevel?: 'none' | 'some' | 'good';
  };
  riskContext?: {
    riskLevelBand?: 'low' | 'medium' | 'high';
    topDrivers?: string[];
    notes?: string;
  };
  suppliesContext?: {
    preparednessDaysEstimate?: number;
    gapsTop3?: string[];
  };
  preferences?: {
    calmTone?: boolean;
    avoidFearLanguage?: boolean;
    mobilityPlanPreference?: 'stay_first' | 'leave_first' | 'balanced';
  };
  // Legacy fields for backwards compatibility
  region?: string;
  country?: string;
  riskLevelBand?: string;
  householdSizeBucket?: string;
  hasKids?: boolean;
  hasPets?: boolean;
  mobilityLevel?: string;
  preparednessDays?: number;
  constraints?: string[];
}

// Risk insights input
interface RiskInsightsInput {
  locale: 'en' | 'pt';
  location?: {
    country?: string;
    city?: string;
    postalCode?: string;
  };
  household?: {
    adults?: number;
    kids?: number;
    pets?: number;
    mobilityLevel?: string;
    vehicleAccess?: string;
  };
  risk: {
    score: number;
    level: 'low' | 'medium' | 'high';
    drivers: Array<{ key: string; weight: number }>;
  };
}

// Fallback prompts (used if DB fetch fails)
const FALLBACK_PLAN_SYSTEM_PROMPT = `You are Resilient.app's crisis-preparedness planner. Produce calm, practical, offline-first guidance tailored to the user's situation. Avoid fear language. Do not include instructions for wrongdoing, weapons, violence, or illegal actions. Encourage following local authorities and official guidance.`;

const FALLBACK_PLAN_A_DEVELOPER_PROMPT_EN = `Return ONLY valid JSON that matches the Plan schema provided. No markdown.
The plan must be tailored using city/postalCode and home signals (apartment/house, elevator, vehicle access, cooking/heating options, internet reliance, pets/kids, mobility constraints).
Do NOT output personal identifiers (full names, exact address, IDs, bank details) or highly sensitive medical details. Keep details high-level and actionable.
Plan A is "shelter in place": focus on staying safely at home during disruptions (power/internet outage, supply shock, local unrest, severe weather).
Include:
- whyThisFitsYou (2–3 sentences, calm)
- topPrioritiesThisWeek (exactly 5 bullets)
- strong homeSetup section (power/water/cooking/comms/documents)
- stepsFirstHour and stepsFirstDay that reflect the home reality
Locale must be English. Output all text in English.
End notes with: "Always follow local authorities.".`;

const FALLBACK_PLAN_A_DEVELOPER_PROMPT_PT = `Return ONLY valid JSON that matches the Plan schema provided. No markdown.
The plan must be tailored using city/postalCode and home signals (apartment/house, elevator, vehicle access, cooking/heating options, internet reliance, pets/kids, mobility constraints).
Do NOT output personal identifiers (full names, exact address, IDs, bank details) or highly sensitive medical details. Keep details high-level and actionable.
Plan A is "shelter in place": focus on staying safely at home during disruptions (power/internet outage, supply shock, local unrest, severe weather).
Include:
- whyThisFitsYou (2–3 sentences, calm)
- topPrioritiesThisWeek (exactly 5 bullets)
- strong homeSetup section (power/water/cooking/comms/documents)
- stepsFirstHour and stepsFirstDay that reflect the home reality
Locale must be Portuguese. Output all text in Portuguese.
End notes with: "Siga sempre as instruções das autoridades locais.".`;

const FALLBACK_PLAN_B_DEVELOPER_PROMPT_EN = `Return ONLY valid JSON that matches the Plan schema provided. No markdown.

Plan B must be clearly different from Plan A:
- It is "Leave / Relocate" focused.
- It must include decision logic: clear triggers, readiness checks, and a simple go/no-go checklist.
- It must emphasize mobility, transport constraints, alternatives, and route planning principles WITHOUT giving operationally sensitive details.
- Use city/postalCode and home signals to tailor: apartment/house, elevator, floor, car/no car, pets/kids, mobility constraints.

Include these Plan B-specific requirements in the JSON fields:
- mobility.meetingPoints: primary/secondary (describe as categories, e.g., "nearby safe public landmark", not exact addresses)
- mobility.routeNotes: 3–6 items that cover route concepts, alternatives, and considerations
- stepsFirstHour and stepsFirstDay must reflect "leave" actions and coordination rules, not "stay home".
- topPrioritiesThisWeek (exactly 5) must focus on enabling mobility and rendezvous readiness.
- communications must include a simple check-in rule and out-of-area contact role.
Do NOT output: exact route turn-by-turn directions, exact home address, exact safehouse address, or anything that could be used for harm.
Locale must be English. Output all text in English.
End notes with: "Always follow local authorities.".`;

const FALLBACK_PLAN_B_DEVELOPER_PROMPT_PT = `Return ONLY valid JSON that matches the Plan schema provided. No markdown.

Plan B must be clearly different from Plan A:
- It is "Leave / Relocate" focused.
- It must include decision logic: clear triggers, readiness checks, and a simple go/no-go checklist.
- It must emphasize mobility, transport constraints, alternatives, and route planning principles WITHOUT giving operationally sensitive details.
- Use city/postalCode and home signals to tailor: apartment/house, elevator, floor, car/no car, pets/kids, mobility constraints.

Include these Plan B-specific requirements in the JSON fields:
- mobility.meetingPoints: primary/secondary (describe as categories, e.g., "nearby safe public landmark", not exact addresses)
- mobility.routeNotes: 3–6 items that cover route concepts, alternatives, and considerations
- stepsFirstHour and stepsFirstDay must reflect "leave" actions and coordination rules, not "stay home".
- topPrioritiesThisWeek (exactly 5) must focus on enabling mobility and rendezvous readiness.
- communications must include a simple check-in rule and out-of-area contact role.
Do NOT output: exact route turn-by-turn directions, exact home address, exact safehouse address, or anything that could be used for harm.
Locale must be Portuguese. Output all text in Portuguese.
End notes with: "Siga sempre as instruções das autoridades locais.".`;

const FALLBACK_INSIGHTS_SYSTEM_PROMPT = `You are Resilient.app's calm preparedness advisor. Explain risk results in a reassuring, practical way. Avoid fear language. Do not speculate beyond the provided drivers. Encourage following local authorities and official guidance.`;

const FALLBACK_INSIGHTS_DEVELOPER_PROMPT_EN = `Return ONLY valid JSON. No markdown.

Input will include a risk score, risk level, and top drivers with weights (e.g., power_outage, flood, civil_unrest, cyber_outage, supply_disruption).
You must output:
- explanation: 2–3 sentences max, calm tone, tailored to location + household + mobility at a high level
- top_priorities: exactly 3 bullets derived directly from the top drivers
- watchlist: exactly 3 short "watch signals" items (neutral, non-alarmist) that users can monitor (e.g., official alerts, weather warnings, outage notices)
Do NOT mention pricing or Premium. Do NOT mention "Red Folder". This is an insight block, not marketing.
Locale must be English. Output all text in English.`;

const FALLBACK_INSIGHTS_DEVELOPER_PROMPT_PT = `Return ONLY valid JSON. No markdown.

Input will include a risk score, risk level, and top drivers with weights (e.g., power_outage, flood, civil_unrest, cyber_outage, supply_disruption).
You must output:
- explanation: 2–3 sentences max, calm tone, tailored to location + household + mobility at a high level
- top_priorities: exactly 3 bullets derived directly from the top drivers
- watchlist: exactly 3 short "watch signals" items (neutral, non-alarmist) that users can monitor (e.g., official alerts, weather warnings, outage notices)
Do NOT mention pricing or Premium. Do NOT mention "Red Folder". This is an insight block, not marketing.
Locale must be Portuguese. Output all text in Portuguese.`;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Auth: Require valid JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Create admin client for DB operations (prompts, rate limits)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify JWT and get user
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
    if (claimsError || !claimsData?.user) {
      console.error('JWT verification failed:', claimsError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const userId = claimsData.user.id;

    // Check rate limit
    const rateLimit = await checkRateLimit(supabaseAdmin, userId, "run_ai_job");
    if (!rateLimit.allowed) {
      console.log(`Rate limit exceeded for user ${userId} on run_ai_job`);
      return rateLimitResponse(rateLimit, corsHeaders);
    }

    // 2. Parse request
    const { job_id } = await req.json();
    if (!job_id) {
      return new Response(JSON.stringify({ error: 'Missing job_id' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    console.log(`Processing AI job: ${job_id} for user: ${userId}`);

    // 3. Load and validate job
    const { data: job, error: jobError } = await supabase
      .from('ai_jobs')
      .select('*')
      .eq('id', job_id)
      .eq('user_id', userId)
      .single();

    if (jobError || !job) {
      console.error('Job not found:', jobError);
      return new Response(JSON.stringify({ error: 'Job not found or access denied' }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Allow only queued or failed jobs (for retries)
    if (!['queued', 'failed'].includes(job.status)) {
      return new Response(JSON.stringify({ error: `Invalid job status: ${job.status}` }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Update status to running
    await supabase
      .from('ai_jobs')
      .update({ status: 'running', updated_at: new Date().toISOString() })
      .eq('id', job_id);

    // Determine job type and route accordingly
    const jobType = job.job_type as string;
    const isInsightsJob = jobType === 'risk_insights';
    const isPlanJob = jobType.startsWith('plan_');

    let systemPrompt: string;
    let developerPrompt: string;
    let userPrompt: string;
    let schema: object;

    if (isInsightsJob) {
      // Handle risk insights job
      const input = job.input_summary as RiskInsightsInput;
      const isPortuguese = input.locale === 'pt';

      // Get prompts from DB (with fallbacks)
      systemPrompt = await getLocalePrompt(
        supabaseAdmin,
        'run_ai_insights_system',
        input.locale,
        FALLBACK_INSIGHTS_SYSTEM_PROMPT
      );
      
      developerPrompt = await getLocalePrompt(
        supabaseAdmin,
        'run_ai_insights_developer',
        input.locale,
        isPortuguese ? FALLBACK_INSIGHTS_DEVELOPER_PROMPT_PT : FALLBACK_INSIGHTS_DEVELOPER_PROMPT_EN
      );

      userPrompt = `Create Premium Insights for this risk assessment. Use only this JSON input:\n\n${JSON.stringify(input, null, 2)}`;
      schema = INSIGHTS_SCHEMA;

      console.log('Processing risk insights job');
    } else if (isPlanJob) {
      // Handle plan generation job
      const input = job.input_summary as PlanGenerationInput;
      const locale = input.locale || 'en';
      const planType = input.planType || 'A';
      const isPortuguese = locale === 'pt';

      // Get prompts from DB (with fallbacks)
      systemPrompt = await getLocalePrompt(
        supabaseAdmin,
        'run_ai_plan_system',
        locale,
        FALLBACK_PLAN_SYSTEM_PROMPT
      );
      
      if (planType === 'A') {
        developerPrompt = await getLocalePrompt(
          supabaseAdmin,
          'run_ai_plan_a_developer',
          locale,
          isPortuguese ? FALLBACK_PLAN_A_DEVELOPER_PROMPT_PT : FALLBACK_PLAN_A_DEVELOPER_PROMPT_EN
        );
      } else {
        developerPrompt = await getLocalePrompt(
          supabaseAdmin,
          'run_ai_plan_b_developer',
          locale,
          isPortuguese ? FALLBACK_PLAN_B_DEVELOPER_PROMPT_PT : FALLBACK_PLAN_B_DEVELOPER_PROMPT_EN
        );
      }
      
      // Build user prompt with full input
      userPrompt = `Generate Plan ${planType} (${planType === 'A' ? 'Shelter in place' : 'Leave / Relocate'}) for this user context. Use the following JSON as the only input:\n\n${JSON.stringify(input, null, 2)}\n\nOutput must match the schema exactly and be realistic for the user's location and household.`;
      schema = PLAN_SCHEMA;

      console.log(`Processing plan ${planType} job with rich context`);
    } else {
      console.error('Unknown job type:', jobType);
      await supabase
        .from('ai_jobs')
        .update({ status: 'failed', error: 'Unknown job type', updated_at: new Date().toISOString() })
        .eq('id', job_id);
      return new Response(JSON.stringify({ error: 'Unknown job type' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // 5. Call OpenAI API with tool calling for structured output
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      console.error('OPENAI_API_KEY not configured');
      await supabase
        .from('ai_jobs')
        .update({ status: 'failed', error: 'AI service not configured', updated_at: new Date().toISOString() })
        .eq('id', job_id);
      return new Response(JSON.stringify({ error: 'AI service not configured' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const functionName = isInsightsJob ? 'generate_risk_insights' : 'generate_emergency_plan';
    const functionDescription = isInsightsJob 
      ? 'Generate calm, practical risk insights with priorities and watchlist'
      : 'Generate a structured, tailored emergency preparedness plan';

    console.log('Calling OpenAI API...');

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini-2025-04-14',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'developer', content: developerPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: [{
          type: 'function',
          function: {
            name: functionName,
            description: functionDescription,
            parameters: schema
          }
        }],
        tool_choice: { type: 'function', function: { name: functionName } },
        max_completion_tokens: isInsightsJob ? 400 : 1400,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', openaiResponse.status, errorText);
      await supabase
        .from('ai_jobs')
        .update({ status: 'failed', error: `AI error: ${openaiResponse.status}`, updated_at: new Date().toISOString() })
        .eq('id', job_id);
      return new Response(JSON.stringify({ error: 'AI generation failed' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const openaiData = await openaiResponse.json();
    console.log('OpenAI response received');

    // Extract structured output from tool call
    const toolCall = openaiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error('No tool call in response:', JSON.stringify(openaiData));
      await supabase
        .from('ai_jobs')
        .update({ status: 'failed', error: 'Invalid AI response format', updated_at: new Date().toISOString() })
        .eq('id', job_id);
      return new Response(JSON.stringify({ error: 'Invalid AI response' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    let output;
    try {
      output = JSON.parse(toolCall.function.arguments);
    } catch (parseError) {
      console.error('Failed to parse tool call arguments:', parseError);
      await supabase
        .from('ai_jobs')
        .update({ status: 'failed', error: 'Failed to parse AI output', updated_at: new Date().toISOString() })
        .eq('id', job_id);
      return new Response(JSON.stringify({ error: 'Failed to parse AI output' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // For plan jobs, ensure safety line in notes
    if (isPlanJob && output.notes !== undefined) {
      const input = job.input_summary as PlanGenerationInput;
      const isPortuguese = input.locale === 'pt';
      const safetyLine = isPortuguese 
        ? 'Siga sempre as instruções das autoridades locais.' 
        : 'Always follow local authorities.';
      if (!output.notes?.includes(safetyLine)) {
        output.notes = output.notes 
          ? `${output.notes} ${safetyLine}` 
          : safetyLine;
      }
    }

    console.log(`${isInsightsJob ? 'Insights' : 'Plan'} generated successfully`);

    // 6. Save result to ai_jobs
    const { error: updateError } = await supabase
      .from('ai_jobs')
      .update({ 
        status: 'done', 
        output: output, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', job_id);

    if (updateError) {
      console.error('Failed to save job result:', updateError);
    }

    return new Response(JSON.stringify({ 
      ok: true, 
      job_id, 
      status: 'done', 
      output: output,
      rateLimit: {
        remaining: rateLimit.remaining,
        limit: rateLimit.limit,
        resetAt: rateLimit.resetAt.toISOString()
      }
    }), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': String(rateLimit.limit),
        'X-RateLimit-Remaining': String(rateLimit.remaining),
        'X-RateLimit-Reset': rateLimit.resetAt.toISOString()
      },
    });

  } catch (error) {
    console.error('Unexpected error in run-ai-job:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

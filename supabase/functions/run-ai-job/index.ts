import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify JWT and get user
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      console.error('JWT verification failed:', claimsError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const userId = claimsData.claims.sub;

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

    // 4. Build prompt from input_summary (non-sensitive only)
    const input = job.input_summary as PlanGenerationInput;

    const locale = input.locale || 'en';
    const planType = input.planType || 'A';
    const isPortuguese = locale === 'pt';

    // Build rich context from input
    const location = input.location || {};
    const household = input.household || {};
    const homeReality = input.homeReality || {};
    const riskContext = input.riskContext || {};
    const suppliesContext = input.suppliesContext || {};
    const preferences = input.preferences || { calmTone: true, avoidFearLanguage: true };

    // Derive household size for backwards compatibility
    const householdSize = (household.adults || 2) + (household.kids || 0);
    const hasPets = (household.pets || 0) > 0 || input.hasPets;
    const hasKids = (household.kids || 0) > 0 || input.hasKids;
    const petTypes = household.petTypes || [];

    const systemPrompt = `You are Resilient.app's crisis-preparedness planner. Your job is to produce calm, practical, offline-first emergency plans tailored to the user's situation. Do not use fear language. Do not provide instructions for wrongdoing, weapons, or violence. Keep it safe, legal, and focused on preparedness and resilience. Always encourage following local authorities and official guidance.`;

    const developerPrompt = `Generate a tailored plan draft in the requested locale (${isPortuguese ? 'Portuguese' : 'English'}). Use the provided city/postalCode and home reality signals to make the plan feel specific (e.g., apartment vs house, elevator, vehicle access), but never request or output personal identifiers such as full names, exact address, IDs, bank details, or medical diagnoses. Do not include operationally sensitive details beyond general preparedness.

Return ONLY valid JSON matching the schema. No markdown.
Tone: calm, reassuring, action-oriented.`;

    // Build detailed user prompt
    const locationDesc = location.city 
      ? `${location.city}${location.postalCode ? ', ' + location.postalCode : ''}${location.country ? ', ' + location.country : ''}`
      : input.region || 'General location';

    const dwellingDesc = location.dwellingType 
      ? `${location.dwellingType}${location.floorLevel ? ' (floor: ' + location.floorLevel + ')' : ''}${location.hasElevator ? ' with elevator' : ''}${location.hasGarden ? ' with garden' : ''}`
      : 'standard dwelling';

    const householdDesc = `${householdSize} people (${household.adults || 2} adults${hasKids ? ', ' + (household.kids || 0) + ' children' : ''})${hasPets ? ', ' + (household.pets || 1) + ' pets (' + petTypes.join(', ') + ')' : ''}`;

    const mobilityDesc = household.mobilityConstraints?.length 
      ? `Mobility: ${household.mobilityConstraints.join(', ')}`
      : input.mobilityLevel ? `Mobility level: ${input.mobilityLevel}` : '';

    const homeRealityDesc = [
      homeReality.vehicleAccess ? `Vehicle: ${homeReality.vehicleAccess}` : '',
      homeReality.powerOutagePreparedness ? `Power prep: ${homeReality.powerOutagePreparedness}` : '',
      homeReality.waterStorage ? `Water storage: ${homeReality.waterStorage}` : '',
      homeReality.heatingType ? `Heating: ${homeReality.heatingType}` : '',
      homeReality.cookingOptions?.length ? `Cooking: ${homeReality.cookingOptions.join(', ')}` : '',
      homeReality.cashOnHandLevel ? `Cash reserve: ${homeReality.cashOnHandLevel}` : '',
    ].filter(Boolean).join('; ');

    const riskDesc = [
      riskContext.riskLevelBand || input.riskLevelBand || 'medium',
      riskContext.topDrivers?.length ? `Top concerns: ${riskContext.topDrivers.join(', ')}` : '',
    ].filter(Boolean).join(' - ');

    const suppliesDesc = suppliesContext.preparednessDaysEstimate || input.preparednessDays
      ? `Preparedness target: ${suppliesContext.preparednessDaysEstimate || input.preparednessDays} days${suppliesContext.gapsTop3?.length ? ', gaps: ' + suppliesContext.gapsTop3.join(', ') : ''}`
      : '';

    const userPrompt = `Create a ${planType === 'A' ? 'Shelter in Place (Plan A)' : 'Evacuation/Leave (Plan B)'} plan draft for a household in ${locationDesc}.

Dwelling: ${dwellingDesc}
Household: ${householdDesc}
${mobilityDesc}
${homeRealityDesc ? 'Home reality: ' + homeRealityDesc : ''}
Risk context: ${riskDesc}
${suppliesDesc}
${riskContext.notes ? 'User notes: ' + riskContext.notes : ''}
${input.constraints?.length ? 'Additional constraints: ' + input.constraints.join(', ') : ''}

Important:
- Plans must be actionable and specific to the user's home reality and household.
- Include a short "whyThisFitsYou" explanation (2-3 sentences, 40-280 chars) referencing household and home reality (apartment/house, mobility, pets, outage reliance, etc.).
- Include "topPrioritiesThisWeek" list (exactly 5 items) derived from the biggest gaps.
- Output in ${isPortuguese ? 'Portuguese' : 'English'} only.
- Do not mention Premium, pricing, or product marketing.
- Do not reference external URLs.
- End notes with: "${isPortuguese ? 'Siga sempre as instruções das autoridades locais.' : 'Always follow local authorities.'}".`;

    console.log('Calling OpenAI API with rich context...');

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
            name: 'generate_emergency_plan',
            description: 'Generate a structured, tailored emergency preparedness plan',
            parameters: PLAN_SCHEMA
          }
        }],
        tool_choice: { type: 'function', function: { name: 'generate_emergency_plan' } },
        max_completion_tokens: 1200,
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

    let planOutput;
    try {
      planOutput = JSON.parse(toolCall.function.arguments);
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

    // Ensure safety line in notes
    const safetyLine = isPortuguese 
      ? 'Siga sempre as instruções das autoridades locais.' 
      : 'Always follow local authorities.';
    if (!planOutput.notes?.includes(safetyLine)) {
      planOutput.notes = planOutput.notes 
        ? `${planOutput.notes} ${safetyLine}` 
        : safetyLine;
    }

    console.log('Plan generated successfully');

    // 6. Save result to ai_jobs
    const { error: updateError } = await supabase
      .from('ai_jobs')
      .update({ 
        status: 'done', 
        output: planOutput, 
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
      output: planOutput 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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

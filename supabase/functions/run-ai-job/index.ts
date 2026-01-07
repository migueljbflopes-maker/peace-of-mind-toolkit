import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Plan draft JSON schema for structured output
const PLAN_SCHEMA = {
  type: "object",
  required: ["planType", "locale", "title", "summary", "triggers", "objectives", "meetingPoints", "communications", "mobility", "essentialsGrabList", "stepsFirstHour", "stepsFirstDay", "notes"],
  properties: {
    planType: { type: "string", enum: ["A", "B"] },
    locale: { type: "string", enum: ["en", "pt"] },
    title: { type: "string" },
    summary: { type: "string" },
    triggers: { type: "array", items: { type: "string" }, minItems: 5, maxItems: 10 },
    objectives: { type: "array", items: { type: "string" }, minItems: 5, maxItems: 10 },
    meetingPoints: {
      type: "object",
      required: ["primary", "secondary"],
      properties: {
        primary: { type: "string" },
        secondary: { type: "string" }
      },
      additionalProperties: false
    },
    communications: {
      type: "object",
      required: ["checkInRule", "outOfAreaContactRole"],
      properties: {
        checkInRule: { type: "string" },
        outOfAreaContactRole: { type: "string" }
      },
      additionalProperties: false
    },
    mobility: {
      type: "object",
      required: ["constraints", "transport", "notes"],
      properties: {
        constraints: { type: "string" },
        transport: { type: "string" },
        notes: { type: "string" }
      },
      additionalProperties: false
    },
    essentialsGrabList: { type: "array", items: { type: "string" }, minItems: 10, maxItems: 18 },
    stepsFirstHour: { type: "array", items: { type: "string" }, minItems: 6, maxItems: 12 },
    stepsFirstDay: { type: "array", items: { type: "string" }, minItems: 6, maxItems: 12 },
    notes: { type: "string" }
  },
  additionalProperties: false
};

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
    const input = job.input_summary as {
      locale?: string;
      planType?: string;
      region?: string;
      country?: string;
      riskLevelBand?: string;
      householdSizeBucket?: string;
      hasKids?: boolean;
      hasPets?: boolean;
      mobilityLevel?: string;
      preparednessDays?: number;
      constraints?: string[];
    };

    const locale = input.locale || 'en';
    const planType = input.planType || 'A';
    const isPortuguese = locale === 'pt';

    const systemPrompt = `You are a calm, practical emergency preparedness advisor for ${isPortuguese ? 'Portuguese' : 'English'}-speaking users. 
You help families create actionable emergency plans. Your tone is reassuring, not alarmist.
IMPORTANT: 
- Output ONLY in ${isPortuguese ? 'Portuguese (European/Brazilian)' : 'English'}.
- Keep advice practical and generic (no legal or medical claims).
- Always end notes with: "${isPortuguese ? 'Siga sempre as instruções das autoridades locais.' : 'Always follow local authorities.'}"
- Generate content appropriate for: ${planType === 'A' ? 'Shelter in Place' : 'Evacuation/Relocation'} plan.`;

    const userPrompt = `Generate an emergency ${planType === 'A' ? 'Shelter in Place' : 'Evacuation/Leave'} plan with the following context:
- Region: ${input.region || 'Global'}${input.country ? ` (${input.country})` : ''}
- Risk level: ${input.riskLevelBand || 'medium'}
- Household size: ${input.householdSizeBucket || '2-3'} people
- Has children: ${input.hasKids ? 'Yes' : 'No'}
- Has pets: ${input.hasPets ? 'Yes' : 'No'}
- Mobility level: ${input.mobilityLevel || 'high'}
- Preparedness target: ${input.preparednessDays || 14} days
${input.constraints?.length ? `- Special considerations: ${input.constraints.join(', ')}` : ''}

Return a complete, practical plan for this household.`;

    console.log('Calling OpenAI API...');

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
          { role: 'user', content: userPrompt }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'generate_emergency_plan',
            description: 'Generate a structured emergency preparedness plan',
            parameters: PLAN_SCHEMA
          }
        }],
        tool_choice: { type: 'function', function: { name: 'generate_emergency_plan' } },
        max_completion_tokens: 900,
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

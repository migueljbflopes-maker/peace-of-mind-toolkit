import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RiskInput {
  score: number;
  riskLevel: string;
  city: string;
  country: string;
  breakdown: {
    location_context: number;
    household_complexity: number;
    mobility_constraints: number;
    preparedness_autonomy: number;
  };
  inputs: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const input: RiskInput = await req.json();
    const { score, riskLevel, city, country, breakdown, inputs } = input;

    const systemPrompt = `You are a calm emergency preparedness advisor. Analyze the user's risk assessment and provide personalized insights. Be reassuring, practical, and action-oriented. Do not use fear language. Always be encouraging about their preparedness journey.

Respond in JSON format only with this exact structure:
{
  "explanation": "2-3 sentences about their risk profile in a calm, supportive tone",
  "top_priorities": ["priority 1", "priority 2", "priority 3"],
  "watchlist": ["signal to watch 1", "signal to watch 2", "signal to watch 3"],
  "location_insights": ["location-specific insight 1", "location-specific insight 2"]
}`;

    const userPrompt = `Analyze this risk assessment for someone in ${city}, ${country}:

Readiness Score: ${score}/100 (${riskLevel} risk level)

Breakdown:
- Location Context: ${breakdown.location_context}%
- Household Complexity: ${breakdown.household_complexity}%
- Mobility Constraints: ${breakdown.mobility_constraints}%
- Preparedness Autonomy: ${breakdown.preparedness_autonomy}%

User Inputs: ${JSON.stringify(inputs, null, 2)}

Provide personalized insights focusing on their specific location and situation.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini-2025-04-14',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_completion_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    // Parse the JSON response
    let insights;
    try {
      // Clean the response - remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
      insights = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      throw new Error('Invalid response format from AI');
    }

    return new Response(
      JSON.stringify(insights),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-risk-insights:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

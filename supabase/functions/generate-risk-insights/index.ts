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

interface RiskInsightsOutput {
  summary: string;
  infrastructure_analysis: {
    hospitals: string;
    emergency_services: string;
    supply_chains: string;
    utilities: string;
  };
  regional_risks: Array<{
    risk: string;
    level: 'low' | 'medium' | 'high';
    details: string;
  }>;
  dimension_insights: {
    location: { score: number; analysis: string; recommendations: string[] };
    household: { score: number; analysis: string; recommendations: string[] };
    mobility: { score: number; analysis: string; recommendations: string[] };
    supplies: { score: number; analysis: string; recommendations: string[] };
  };
  top_priorities: string[];
  watchlist: string[];
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

    const systemPrompt = `You are a calm emergency preparedness advisor analyzing someone's risk profile for ${city}, ${country}.

IMPORTANT: Be reassuring, practical, and action-oriented. Do not use fear language. Always be encouraging.

Provide a comprehensive analysis including:

1. INFRASTRUCTURE ANALYSIS for ${city}:
   - Hospitals/medical facilities: typical access, distance estimates, capacity insights
   - Emergency services: fire, police, ambulance coverage and response times
   - Supply chains: supermarket density, logistics reliability
   - Utilities: power grid stability, water supply reliability, communication networks

2. REGIONAL RISK FACTORS specific to ${city}, ${country}:
   A) Natural Hazards:
      - Floods, earthquakes, storms, heatwaves, wildfires (rate each as low/medium/high)
      - Climate patterns and seasonal risks
   B) Infrastructure Vulnerabilities:
      - Power grid reliability and outage frequency
      - Communication network resilience
      - Water supply dependencies
   C) Geopolitical & Security Risks:
      - Nuclear: Proximity to nuclear facilities, regional nuclear tensions, fallout zone risk
      - Cyber: Critical infrastructure cyber vulnerability, digital dependency risks
      - Military/Conflict: Regional tensions, border proximity, military installations nearby
      - Terrorism: Urban terrorism risk assessment, proximity to symbolic targets
      - Civil Unrest: Political stability, protest patterns, social tensions
   Consider geography, urban density, and current geopolitical context.

3. DIMENSION-BY-DIMENSION ANALYSIS based on their scores:
   - Location (${breakdown.location_context}%): analyze their home type, floor level, neighborhood
   - Household (${breakdown.household_complexity}%): family size, special needs, pets
   - Mobility (${breakdown.mobility_constraints}%): evacuation options, vehicle access, physical constraints
   - Supplies (${breakdown.preparedness_autonomy}%): current preparedness level, gaps

Respond in JSON format ONLY with this exact structure:
{
  "summary": "2-3 sentences overview of their risk profile in a calm, supportive tone",
  "infrastructure_analysis": {
    "hospitals": "Analysis of medical facility access for their location",
    "emergency_services": "Fire/police/ambulance coverage assessment",
    "supply_chains": "Supermarket and logistics access analysis",
    "utilities": "Power, water, and communication reliability"
  },
  "regional_risks": [
    { "risk": "Risk name", "level": "low|medium|high", "details": "Brief explanation" }
  ],
  "dimension_insights": {
    "location": { "score": ${breakdown.location_context}, "analysis": "Their location situation", "recommendations": ["Specific action 1", "Specific action 2"] },
    "household": { "score": ${breakdown.household_complexity}, "analysis": "Their household situation", "recommendations": ["Specific action 1", "Specific action 2"] },
    "mobility": { "score": ${breakdown.mobility_constraints}, "analysis": "Their mobility situation", "recommendations": ["Specific action 1", "Specific action 2"] },
    "supplies": { "score": ${breakdown.preparedness_autonomy}, "analysis": "Their supplies situation", "recommendations": ["Specific action 1", "Specific action 2"] }
  },
  "top_priorities": ["Priority 1", "Priority 2", "Priority 3"],
  "watchlist": ["Signal to watch 1", "Signal to watch 2", "Signal to watch 3"]
}`;

    const userPrompt = `Analyze this risk assessment:

Location: ${city}, ${country}
Readiness Score: ${score}/100 (${riskLevel})

Breakdown Scores:
- Location Context: ${breakdown.location_context}%
- Household Complexity: ${breakdown.household_complexity}%
- Mobility Constraints: ${breakdown.mobility_constraints}%
- Preparedness Autonomy: ${breakdown.preparedness_autonomy}%

Detailed User Inputs:
${JSON.stringify(inputs, null, 2)}

Provide a comprehensive, personalized analysis with specific infrastructure details for ${city}, regional risks, and actionable recommendations for each dimension.`;

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
        max_completion_tokens: 1500,
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

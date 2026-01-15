import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a calm, knowledgeable Security & Preparedness Expert helping families prepare for emergencies. Your tone is reassuring and practical, never alarmist. Focus on actionable advice that can be implemented step-by-step.

Key principles:
- Provide clear, prioritized recommendations
- Consider different household sizes and situations
- Reference official guidance (FEMA, Red Cross, government agencies) when relevant
- Keep responses concise but comprehensive (2-3 paragraphs max)
- Always emphasize that preparation brings peace of mind, not fear

Categories you're expert in:
- Security: Home security, personal safety, situational awareness
- Medical: First aid kits, emergency medications, health considerations
- Supplies: Emergency kits, food/water storage, essential items
- Evacuation: Bug-out bags, evacuation routes, safe locations
- General: Overall preparedness planning, family communication plans`;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get auth token from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create supabase client with user's auth
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get user
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check premium status using service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: entitlement } = await supabaseAdmin
      .from("premium_entitlements")
      .select("is_premium")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!entitlement?.is_premium) {
      return new Response(
        JSON.stringify({ error: "Premium required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request
    const { question_id, category, question } = await req.json();

    if (!question_id || !question) {
      return new Response(
        JSON.stringify({ error: "Missing question_id or question" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call Lovable AI Gateway
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Category: ${category || "general"}\n\nQuestion: ${question}`,
          },
        ],
        max_tokens: 500,
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted, please contact support." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", status, errorText);
      throw new Error("AI service error");
    }

    const aiData = await aiResponse.json();
    const answer = aiData.choices?.[0]?.message?.content || "I apologize, but I couldn't generate a response. Please try again.";

    // Update the question with the answer using service role
    const { error: updateError } = await supabaseAdmin
      .from("expert_questions")
      .update({
        answer,
        status: "answered",
        answered_at: new Date().toISOString(),
      })
      .eq("id", question_id)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Failed to update question:", updateError);
      // Still return the answer even if DB update fails
    }

    console.log(`Expert question answered for user ${user.id}: ${question.substring(0, 50)}...`);

    return new Response(
      JSON.stringify({ answer, status: "answered" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("expert-chat error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

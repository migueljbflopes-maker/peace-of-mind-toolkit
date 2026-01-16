/**
 * Fetch a prompt from the database, falling back to hardcoded content if not found or inactive.
 * 
 * @param supabase - Supabase client (with service role for edge functions)
 * @param promptKey - The unique key for the prompt (e.g., 'expert_chat_system')
 * @param fallback - The hardcoded fallback prompt to use if DB lookup fails
 * @returns The prompt content from DB if active, otherwise the fallback
 */
// deno-lint-ignore no-explicit-any
export async function getPrompt(
  supabase: any,
  promptKey: string,
  fallback: string
): Promise<string> {
  try {
    const { data, error } = await supabase
      .from("ai_prompts")
      .select("content")
      .eq("prompt_key", promptKey)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      console.warn(`Failed to fetch prompt ${promptKey}:`, error.message);
      return fallback;
    }

    if (data?.content) {
      return data.content;
    }
  } catch (e) {
    console.warn(`Exception fetching prompt ${promptKey}:`, e);
  }

  return fallback;
}

/**
 * Fetch a locale-specific prompt from the database.
 * Tries the specific locale first, then falls back to 'all' locale, then to hardcoded.
 * 
 * @param supabase - Supabase client
 * @param promptKeyBase - The base key (e.g., 'run_ai_plan_a_developer')
 * @param locale - The locale ('en' or 'pt')
 * @param fallback - The hardcoded fallback prompt
 * @returns The prompt content
 */
// deno-lint-ignore no-explicit-any
export async function getLocalePrompt(
  supabase: any,
  promptKeyBase: string,
  locale: string,
  fallback: string
): Promise<string> {
  // First try locale-specific key
  const localeKey = `${promptKeyBase}_${locale}`;
  
  try {
    const { data, error } = await supabase
      .from("ai_prompts")
      .select("content")
      .eq("prompt_key", localeKey)
      .eq("is_active", true)
      .maybeSingle();

    if (!error && data?.content) {
      return data.content;
    }

    // Fallback to 'all' locale version
    const allLocaleKey = `${promptKeyBase}_all`;
    const { data: allData } = await supabase
      .from("ai_prompts")
      .select("content")
      .eq("prompt_key", allLocaleKey)
      .eq("is_active", true)
      .maybeSingle();

    if (allData?.content) {
      return allData.content;
    }
  } catch (e) {
    console.warn(`Exception fetching locale prompt ${localeKey}:`, e);
  }

  return fallback;
}

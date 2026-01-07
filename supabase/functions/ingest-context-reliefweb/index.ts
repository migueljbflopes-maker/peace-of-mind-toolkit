import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NewsItem {
  source_id: string;
  kind: "context";
  published_at: string | null;
  title: string;
  summary: string;
  url: string;
  domain: string | null;
  region: string;
  topics: string[];
  severity: "major" | "moderate";
  language: string;
  dedupe_key: string;
}

function extractDomain(url: string): string | null {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function generateDedupeKey(title: string, url: string, date: string): string {
  const str = `${title}|${url}|${date}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

async function fetchReliefWeb(): Promise<NewsItem[]> {
  console.log("Fetching ReliefWeb humanitarian reports...");
  try {
    const response = await fetch(
      "https://api.reliefweb.int/v1/reports?appname=resilient-app&limit=30&preset=latest&fields[include][]=title&fields[include][]=url_alias&fields[include][]=date.created&fields[include][]=primary_country.name&fields[include][]=disaster_type.name&fields[include][]=source.shortname&fields[include][]=body-html"
    );
    if (!response.ok) throw new Error(`ReliefWeb fetch failed: ${response.status}`);
    
    const data = await response.json();
    const items: NewsItem[] = [];
    
    for (const report of data.data || []) {
      const fields = report.fields;
      const title = fields.title || "Untitled Report";
      const url = `https://reliefweb.int${fields.url_alias || ""}`;
      const published = fields.date?.created || new Date().toISOString();
      const country = fields.primary_country?.name || "Global";
      const disasterTypes = fields.disaster_type?.map((d: any) => d.name) || [];
      const sourceName = fields.source?.shortname || "ReliefWeb";
      
      // Extract summary from body or create one
      let summary = `Report from ${sourceName} regarding ${country}.`;
      if (fields["body-html"]) {
        const plainText = fields["body-html"].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
        summary = plainText.substring(0, 280) + (plainText.length > 280 ? "..." : "");
      }
      
      // Determine topics based on disaster type
      const topics: string[] = [];
      if (disasterTypes.some((d: string) => ["Earthquake", "Flood", "Cyclone", "Volcano", "Drought", "Cold Wave", "Heat Wave", "Landslide", "Tsunami"].includes(d))) {
        topics.push("Natural Hazards");
      }
      if (disasterTypes.some((d: string) => ["Conflict", "War", "Complex Emergency"].includes(d))) {
        topics.push("Conflict & Geopolitics");
      }
      if (disasterTypes.some((d: string) => ["Epidemic", "Health", "Insect Infestation"].includes(d))) {
        topics.push("Public Health");
      }
      if (disasterTypes.some((d: string) => ["Technological Disaster", "Fire"].includes(d))) {
        topics.push("Supply & Infrastructure");
      }
      if (topics.length === 0) topics.push("Natural Hazards");
      
      // Context items are generally moderate severity
      const severity = disasterTypes.some((d: string) => ["War", "Conflict", "Complex Emergency"].includes(d)) ? "major" : "moderate";
      
      items.push({
        source_id: "reliefweb",
        kind: "context",
        published_at: published,
        title: title.length > 200 ? title.substring(0, 197) + "..." : title,
        summary,
        url,
        domain: extractDomain(url),
        region: country,
        topics,
        severity,
        language: "en",
        dedupe_key: generateDedupeKey(`rw-${title}`, url, published.split("T")[0]),
      });
    }
    
    console.log(`Fetched ${items.length} ReliefWeb items`);
    return items;
  } catch (error) {
    console.error("ReliefWeb fetch error:", error);
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting ReliefWeb context ingestion...");
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const items = await fetchReliefWeb();
    console.log(`Total ReliefWeb items fetched: ${items.length}`);

    let inserted = 0;
    let skipped = 0;

    for (const item of items) {
      const { error } = await supabase.from("news_items").upsert(
        { ...item, fetched_at: new Date().toISOString() },
        { onConflict: "dedupe_key", ignoreDuplicates: true }
      );

      if (error) {
        console.log(`Skip/error for ${item.dedupe_key}: ${error.message}`);
        skipped++;
      } else {
        inserted++;
      }
    }

    console.log(`ReliefWeb ingestion complete: ${inserted} inserted, ${skipped} skipped`);

    return new Response(
      JSON.stringify({ success: true, source: "reliefweb", fetched: items.length, inserted, skipped }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("ReliefWeb ingestion error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

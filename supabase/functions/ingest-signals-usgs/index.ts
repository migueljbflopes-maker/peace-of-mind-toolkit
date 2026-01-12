import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NewsItem {
  source_id: string;
  kind: "signals";
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

async function fetchUSGS(): Promise<NewsItem[]> {
  console.log("Fetching USGS earthquake data (M4.5+ last week)...");
  try {
    const response = await fetch(
      "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson"
    );
    if (!response.ok) throw new Error(`USGS fetch failed: ${response.status}`);
    
    const data = await response.json();
    const items: NewsItem[] = [];
    
    for (const feature of data.features.slice(0, 30)) {
      const props = feature.properties;
      const mag = props.mag;
      const place = props.place || "Unknown location";
      const time = new Date(props.time).toISOString();
      const url = props.url || `https://earthquake.usgs.gov/earthquakes/eventpage/${feature.id}`;
      
      items.push({
        source_id: "usgs-earthquake",
        kind: "signals",
        published_at: time,
        title: `M${mag.toFixed(1)} Earthquake - ${place}`,
        summary: `A magnitude ${mag.toFixed(1)} earthquake occurred ${place}. Depth: ${(feature.geometry.coordinates[2] || 0).toFixed(1)} km.`,
        url,
        domain: extractDomain(url),
        region: "Global",
        topics: ["Natural Hazards"],
        severity: mag >= 6.0 ? "major" : "moderate",
        language: "en",
        dedupe_key: generateDedupeKey(`usgs-M${mag.toFixed(1)}-${place}`, url, time.split("T")[0]),
      });
    }
    
    console.log(`Fetched ${items.length} USGS earthquake items`);
    return items;
  } catch (error) {
    console.error("USGS fetch error:", error);
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting USGS signals ingestion...");
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const items = await fetchUSGS();
    console.log(`Total USGS items fetched: ${items.length}`);

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

    console.log(`USGS ingestion complete: ${inserted} inserted, ${skipped} skipped`);

    return new Response(
      JSON.stringify({ success: true, source: "usgs", fetched: items.length, inserted, skipped }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("USGS ingestion error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

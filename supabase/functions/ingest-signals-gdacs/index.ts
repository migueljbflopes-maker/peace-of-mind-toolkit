import { createClient } from "@supabase/supabase-js";

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

async function fetchGDACS(): Promise<NewsItem[]> {
  console.log("Fetching GDACS RSS alerts...");
  try {
    const response = await fetch("https://www.gdacs.org/xml/rss.xml");
    if (!response.ok) throw new Error(`GDACS fetch failed: ${response.status}`);
    
    const text = await response.text();
    const items: NewsItem[] = [];
    
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    const titleRegex = /<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/;
    const linkRegex = /<link>(.*?)<\/link>/;
    const descRegex = /<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/;
    const pubDateRegex = /<pubDate>(.*?)<\/pubDate>/;
    const alertLevelRegex = /gdacs:alertlevel[^>]*>([^<]*)</;
    const countryRegex = /gdacs:country[^>]*>([^<]*)</;
    const eventTypeRegex = /gdacs:eventtype[^>]*>([^<]*)</;
    
    let match;
    let count = 0;
    while ((match = itemRegex.exec(text)) !== null && count < 25) {
      const itemXml = match[1];
      
      const titleMatch = itemXml.match(titleRegex);
      const linkMatch = itemXml.match(linkRegex);
      const descMatch = itemXml.match(descRegex);
      const pubDateMatch = itemXml.match(pubDateRegex);
      const alertMatch = itemXml.match(alertLevelRegex);
      const countryMatch = itemXml.match(countryRegex);
      const eventTypeMatch = itemXml.match(eventTypeRegex);
      
      const title = titleMatch?.[1] || titleMatch?.[2] || "GDACS Alert";
      const url = linkMatch?.[1] || "https://www.gdacs.org";
      const description = descMatch?.[1] || descMatch?.[2] || "";
      const pubDate = pubDateMatch?.[1] ? new Date(pubDateMatch[1]).toISOString() : new Date().toISOString();
      const alertLevel = alertMatch?.[1]?.toLowerCase() || "green";
      const country = countryMatch?.[1] || "Global";
      const eventType = eventTypeMatch?.[1]?.toLowerCase() || "";
      
      // Determine severity: Red/Orange = major, Green = moderate
      const severity = ["red", "orange"].includes(alertLevel) ? "major" : "moderate";
      
      // Determine topic based on event type
      const topics: string[] = ["Natural Hazards"];
      if (eventType.includes("tc") || eventType.includes("cyclone") || eventType.includes("storm")) {
        topics.push("Travel Disruptions");
      }
      
      items.push({
        source_id: "gdacs",
        kind: "signals",
        published_at: pubDate,
        title: title.length > 200 ? title.substring(0, 197) + "..." : title,
        summary: description.replace(/<[^>]*>/g, "").substring(0, 300),
        url,
        domain: extractDomain(url),
        region: country,
        topics,
        severity,
        language: "en",
        dedupe_key: generateDedupeKey(`gdacs-${title}`, url, pubDate.split("T")[0]),
      });
      count++;
    }
    
    console.log(`Fetched ${items.length} GDACS items`);
    return items;
  } catch (error) {
    console.error("GDACS fetch error:", error);
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting GDACS signals ingestion...");
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const items = await fetchGDACS();
    console.log(`Total GDACS items fetched: ${items.length}`);

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

    console.log(`GDACS ingestion complete: ${inserted} inserted, ${skipped} skipped`);

    return new Response(
      JSON.stringify({ success: true, source: "gdacs", fetched: items.length, inserted, skipped }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("GDACS ingestion error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

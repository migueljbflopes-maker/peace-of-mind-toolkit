import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NewsItem {
  source_id: string;
  kind: "signals" | "context" | "headline";
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

// Extract domain from URL
function extractDomain(url: string): string | null {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

// Simple hash function for deduplication
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

// Fetch USGS Earthquake data (signals)
async function fetchUSGS(): Promise<NewsItem[]> {
  console.log("Fetching USGS earthquake data...");
  try {
    const response = await fetch(
      "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson"
    );
    if (!response.ok) throw new Error(`USGS fetch failed: ${response.status}`);
    
    const data = await response.json();
    const items: NewsItem[] = [];
    
    for (const feature of data.features.slice(0, 20)) {
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
        dedupe_key: generateDedupeKey(`M${mag}-${place}`, url, time.split("T")[0]),
      });
    }
    
    console.log(`Fetched ${items.length} USGS items`);
    return items;
  } catch (error) {
    console.error("USGS fetch error:", error);
    return [];
  }
}

// Fetch ReliefWeb reports (context)
async function fetchReliefWeb(): Promise<NewsItem[]> {
  console.log("Fetching ReliefWeb data...");
  try {
    const response = await fetch(
      "https://api.reliefweb.int/v1/reports?appname=resilient-app&limit=20&preset=latest&fields[include][]=title&fields[include][]=url_alias&fields[include][]=date.created&fields[include][]=primary_country.name&fields[include][]=disaster_type.name&fields[include][]=source.shortname"
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
      
      // Determine topics based on disaster type
      const topics: string[] = [];
      if (disasterTypes.some((d: string) => ["Earthquake", "Flood", "Cyclone", "Volcano", "Drought"].includes(d))) {
        topics.push("Natural Hazards");
      }
      if (disasterTypes.some((d: string) => ["Conflict", "War"].includes(d))) {
        topics.push("Conflict & Geopolitics");
      }
      if (disasterTypes.some((d: string) => ["Epidemic", "Health"].includes(d))) {
        topics.push("Public Health");
      }
      if (topics.length === 0) topics.push("Natural Hazards");
      
      items.push({
        source_id: "reliefweb",
        kind: "context",
        published_at: published,
        title: title.length > 200 ? title.substring(0, 197) + "..." : title,
        summary: `Report from ${fields.source?.shortname || "ReliefWeb"} regarding ${country}.`,
        url,
        domain: extractDomain(url),
        region: country,
        topics,
        severity: "moderate",
        language: "en",
        dedupe_key: generateDedupeKey(title, url, published.split("T")[0]),
      });
    }
    
    console.log(`Fetched ${items.length} ReliefWeb items`);
    return items;
  } catch (error) {
    console.error("ReliefWeb fetch error:", error);
    return [];
  }
}

// Fetch GDACS RSS (signals)
async function fetchGDACS(): Promise<NewsItem[]> {
  console.log("Fetching GDACS data...");
  try {
    const response = await fetch("https://www.gdacs.org/xml/rss.xml");
    if (!response.ok) throw new Error(`GDACS fetch failed: ${response.status}`);
    
    const text = await response.text();
    const items: NewsItem[] = [];
    
    // Simple regex-based XML parsing for RSS items
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    const titleRegex = /<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/;
    const linkRegex = /<link>(.*?)<\/link>/;
    const descRegex = /<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/;
    const pubDateRegex = /<pubDate>(.*?)<\/pubDate>/;
    const alertLevelRegex = /gdacs:alertlevel[^>]*>([^<]*)</;
    
    let match;
    let count = 0;
    while ((match = itemRegex.exec(text)) !== null && count < 15) {
      const itemXml = match[1];
      
      const titleMatch = itemXml.match(titleRegex);
      const linkMatch = itemXml.match(linkRegex);
      const descMatch = itemXml.match(descRegex);
      const pubDateMatch = itemXml.match(pubDateRegex);
      const alertMatch = itemXml.match(alertLevelRegex);
      
      const title = titleMatch?.[1] || titleMatch?.[2] || "GDACS Alert";
      const url = linkMatch?.[1] || "https://www.gdacs.org";
      const description = descMatch?.[1] || descMatch?.[2] || "";
      const pubDate = pubDateMatch?.[1] ? new Date(pubDateMatch[1]).toISOString() : new Date().toISOString();
      const alertLevel = alertMatch?.[1]?.toLowerCase() || "green";
      
      // Determine severity: Red/Orange = major, Green = moderate
      const severity = ["red", "orange"].includes(alertLevel) ? "major" : "moderate";
      
      items.push({
        source_id: "gdacs",
        kind: "signals",
        published_at: pubDate,
        title: title.length > 200 ? title.substring(0, 197) + "..." : title,
        summary: description.replace(/<[^>]*>/g, "").substring(0, 300),
        url,
        domain: extractDomain(url),
        region: "Global",
        topics: ["Natural Hazards"],
        severity,
        language: "en",
        dedupe_key: generateDedupeKey(title, url, pubDate.split("T")[0]),
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
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting news ingestion...");
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch from all sources in parallel
    const [usgsItems, reliefWebItems, gdacsItems] = await Promise.all([
      fetchUSGS(),
      fetchReliefWeb(),
      fetchGDACS(),
    ]);

    const allItems = [...usgsItems, ...reliefWebItems, ...gdacsItems];
    console.log(`Total items fetched: ${allItems.length}`);

    let inserted = 0;
    let skipped = 0;

    // Insert items, skipping duplicates
    for (const item of allItems) {
      const { error } = await supabase.from("news_items").upsert(
        {
          ...item,
          fetched_at: new Date().toISOString(),
        },
        {
          onConflict: "dedupe_key",
          ignoreDuplicates: true,
        }
      );

      if (error) {
        console.log(`Skip/error for ${item.dedupe_key}: ${error.message}`);
        skipped++;
      } else {
        inserted++;
      }
    }

    console.log(`Ingestion complete: ${inserted} inserted, ${skipped} skipped`);

    return new Response(
      JSON.stringify({
        success: true,
        fetched: allItems.length,
        inserted,
        skipped,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Ingestion error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

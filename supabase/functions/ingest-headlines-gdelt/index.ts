import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NewsItem {
  source_id: string;
  kind: "headline";
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

// Topic keyword templates (calm, factual language)
const TOPIC_KEYWORDS: Record<string, string> = {
  "Conflict & Geopolitics": '"ceasefire" OR "sanctions" OR "diplomatic" OR "border dispute" OR "troop deployment"',
  "Cyber & Outages": '"outage" OR "ransomware" OR "cyberattack" OR "infrastructure disruption" OR "DDoS"',
  "Supply & Infrastructure": '"port congestion" OR "shipping disruption" OR "fuel shortage" OR "power grid"',
  "Natural Hazards": '"earthquake damage" OR "flood warning" OR "wildfire evacuation" OR "storm warning"',
  "Public Health": '"outbreak" OR "public health advisory" OR "epidemiological update" OR "vaccination campaign"',
  "Travel Disruptions": '"airport closure" OR "flight disruption" OR "border delays" OR "rail disruption"',
};

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

async function fetchAllowedDomains(supabase: any): Promise<string[]> {
  const { data, error } = await supabase
    .from("news_domain_allowlist")
    .select("domain")
    .eq("enabled", true);
  
  if (error) {
    console.error("Failed to fetch allowlist:", error);
    return [];
  }
  
  return data.map((d: { domain: string }) => d.domain);
}

async function fetchGDELTHeadlines(topic: string, keywords: string, allowedDomains: string[]): Promise<NewsItem[]> {
  console.log(`Fetching GDELT headlines for topic: ${topic}`);
  
  // Use a subset of domains for the query (GDELT has query length limits)
  const domainFilter = allowedDomains
    .slice(0, 12)
    .map(d => `domainis:${d}`)
    .join(" OR ");
  
  // Build query: topic keywords + domain filter + exclusions
  const query = `(${keywords}) (${domainFilter}) -sport -celebrity -entertainment`;
  const encodedQuery = encodeURIComponent(query);
  
  const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodedQuery}&mode=artlist&maxrecords=15&format=json&timespan=7d&sort=datedesc`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`GDELT fetch failed for ${topic}: ${response.status}`);
      return [];
    }
    
    // GDELT returns plain text error messages, not JSON - validate first
    const text = await response.text();
    if (!text.startsWith("{") && !text.startsWith("[")) {
      console.error(`GDELT query rejected for ${topic}: ${text.substring(0, 80)}`);
      return [];
    }
    
    const data = JSON.parse(text);
    const items: NewsItem[] = [];
    
    for (const article of data.articles || []) {
      const articleDomain = extractDomain(article.url);
      
      // Double-check domain is in allowlist
      if (!articleDomain || !allowedDomains.includes(articleDomain)) {
        continue;
      }
      
      const published = article.seendate 
        ? new Date(article.seendate.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/, "$1-$2-$3T$4:$5:$6Z")).toISOString()
        : new Date().toISOString();
      
      items.push({
        source_id: "gdelt",
        kind: "headline",
        published_at: published,
        title: article.title?.substring(0, 200) || "Untitled",
        summary: article.title || "",
        url: article.url,
        domain: articleDomain,
        region: article.sourcecountry || "Global",
        topics: [topic],
        severity: "moderate",
        language: article.language || "en",
        dedupe_key: generateDedupeKey(`gdelt-headline-${article.title}`, article.url, published.split("T")[0]),
      });
    }
    
    console.log(`Fetched ${items.length} headlines for ${topic}`);
    return items;
  } catch (error) {
    console.error(`GDELT fetch error for ${topic}:`, error);
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting GDELT headlines ingestion...");
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch allowed domains
    const allowedDomains = await fetchAllowedDomains(supabase);
    if (allowedDomains.length === 0) {
      console.error("No allowed domains found, skipping GDELT ingestion");
      return new Response(
        JSON.stringify({ success: false, error: "No allowed domains configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log(`Using ${allowedDomains.length} allowed domains`);

    // Fetch headlines for each topic (limit to avoid rate limiting)
    const topicsToFetch = Object.entries(TOPIC_KEYWORDS).slice(0, 3); // Fetch 3 topics per run
    
    let allItems: NewsItem[] = [];
    for (const [topic, keywords] of topicsToFetch) {
      const items = await fetchGDELTHeadlines(topic, keywords, allowedDomains);
      allItems = allItems.concat(items);
      // Small delay between requests to be nice to GDELT
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`Total GDELT headlines fetched: ${allItems.length}`);

    let inserted = 0;
    let skipped = 0;

    for (const item of allItems) {
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

    console.log(`GDELT ingestion complete: ${inserted} inserted, ${skipped} skipped`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        source: "gdelt", 
        topics: topicsToFetch.map(([t]) => t),
        fetched: allItems.length, 
        inserted, 
        skipped 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("GDELT ingestion error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

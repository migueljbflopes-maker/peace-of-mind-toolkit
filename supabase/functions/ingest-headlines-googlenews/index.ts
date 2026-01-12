import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NewsItem {
  source_id: string;
  kind: "headline";
  published_at: string;
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

// Google News RSS feeds by topic
const GOOGLE_NEWS_FEEDS: Record<string, { url: string; topics: string[]; region: string }> = {
  "World": {
    url: "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx1YlY4U0FtVnVHZ0pWVXlnQVAB",
    topics: ["Global Affairs"],
    region: "Global",
  },
  "Health": {
    url: "https://news.google.com/rss/topics/CAAqIQgKIhtDQkFTRGdvSUwyMHZNR3QwTlRFU0FtVnVLQUFQAQ",
    topics: ["Public Health"],
    region: "Global",
  },
  "Science": {
    url: "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRFp0Y1RjU0FtVnVHZ0pWVXlnQVAB",
    topics: ["Science & Environment"],
    region: "Global",
  },
  "Business": {
    url: "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx6TVdZU0FtVnVHZ0pWVXlnQVAB",
    topics: ["Economy & Supply"],
    region: "Global",
  },
};

function generateDedupeKey(title: string, source: string, date: string): string {
  const normalizedTitle = title.toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 50);
  return `gnews_${normalizedTitle}_${source.substring(0, 15)}_${date.substring(0, 10)}`;
}

function parseRSSDate(dateStr: string): string {
  try {
    return new Date(dateStr).toISOString();
  } catch {
    return new Date().toISOString();
  }
}

function extractSourceFromTitle(title: string): string {
  // Google News format: "Title - Source Name"
  const match = title.match(/\s-\s([^-]+)$/);
  return match ? match[1].trim() : "Google News";
}

function cleanTitle(title: string): string {
  // Remove source suffix from title
  return title.replace(/\s-\s[^-]+$/, "").trim();
}

async function fetchAllowedDomains(supabase: any): Promise<string[]> {
  const { data, error } = await supabase
    .from("news_domain_allowlist")
    .select("domain")
    .eq("enabled", true);

  if (error) {
    console.error("Error fetching allowed domains:", error);
    return [];
  }
  return data?.map((d: { domain: string }) => d.domain) || [];
}

async function fetchGoogleNewsFeed(
  feedName: string,
  config: { url: string; topics: string[]; region: string },
  allowedDomains: string[]
): Promise<NewsItem[]> {
  try {
    console.log(`Fetching Google News for ${feedName}`);
    
    const response = await fetch(config.url);
    if (!response.ok) {
      console.error(`Google News HTTP error for ${feedName}: ${response.status}`);
      return [];
    }

    const xml = await response.text();
    
    // Simple XML parsing for RSS
    const items: NewsItem[] = [];
    const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);

    for (const match of itemMatches) {
      const itemXml = match[1];
      
      const titleMatch = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/);
      const linkMatch = itemXml.match(/<link>(.*?)<\/link>/);
      const pubDateMatch = itemXml.match(/<pubDate>(.*?)<\/pubDate>/);

      if (!titleMatch || !linkMatch) continue;

      const rawTitle = titleMatch[1] || titleMatch[2] || "";
      const link = linkMatch[1];
      const pubDate = pubDateMatch ? pubDateMatch[1] : new Date().toISOString();

      // Extract real source from Google News title format
      const sourceName = extractSourceFromTitle(rawTitle);
      const title = cleanTitle(rawTitle);

      // Skip if we can't identify source or title is empty
      if (!title || title.length < 10) continue;

      // Check if source domain is in allowlist
      // Google News links are redirects, so we check source name against known domains
      const sourceSlug = sourceName.toLowerCase().replace(/\s/g, "");
      const isAllowed = allowedDomains.some(domain => {
        const domainSlug = domain.replace(/\./g, "").toLowerCase();
        return domainSlug.includes(sourceSlug) || sourceSlug.includes(domainSlug.replace("com", "").replace("org", ""));
      });

      if (!isAllowed) continue;

      // Extract domain from source name (approximate)
      const domainGuess = allowedDomains.find(d => {
        const slug = d.replace(/\./g, "").toLowerCase();
        return slug.includes(sourceSlug) || sourceSlug.includes(slug.replace("com", "").replace("org", ""));
      }) || null;

      items.push({
        source_id: "googlenews",
        kind: "headline",
        published_at: parseRSSDate(pubDate),
        title,
        summary: title, // Google News RSS doesn't provide summaries
        url: link,
        domain: domainGuess,
        region: config.region,
        topics: config.topics,
        severity: "moderate",
        language: "en",
        dedupe_key: generateDedupeKey(title, sourceName, pubDate),
      });
    }

    console.log(`Google News ${feedName}: ${items.length} items from allowed sources`);
    return items;
  } catch (error) {
    console.error(`Google News fetch error for ${feedName}:`, error);
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting Google News headlines ingestion...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const allowedDomains = await fetchAllowedDomains(supabase);
    console.log(`Using ${allowedDomains.length} allowed domains`);

    if (allowedDomains.length === 0) {
      return new Response(
        JSON.stringify({ error: "No allowed domains configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const allItems: NewsItem[] = [];

    for (const [feedName, config] of Object.entries(GOOGLE_NEWS_FEEDS)) {
      const items = await fetchGoogleNewsFeed(feedName, config, allowedDomains);
      allItems.push(...items);
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    console.log(`Total Google News headlines fetched: ${allItems.length}`);

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

    console.log(`Google News ingestion complete: ${inserted} inserted, ${skipped} skipped`);

    return new Response(
      JSON.stringify({
        success: true,
        source: "googlenews",
        fetched: allItems.length,
        inserted,
        skipped,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Google News ingestion error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

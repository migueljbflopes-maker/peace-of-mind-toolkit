// Backlog A-07. What the owner froze in A-03 and this task removed from the
// product: news ingestion and the alerts built on it, the weekly briefing,
// expert chat, Amazon products and affiliates, the subscription funnel.
//
// The tests that keep them out read these lists
// (scripts/frozen-features.test.mjs, e2e/frozen-features.spec.ts). Bringing a
// feature back is an owner decision: take it off the list in the same change.

/** Paths the app must answer with its not-found page. */
export const FROZEN_ROUTES = [
  "/products",
  "/news/weekly",
  "/premium/expert",
  "/riskfunnel1",
  "/admin/affiliates",
];

/** Edge functions that must not exist under supabase/functions. */
export const FROZEN_FUNCTIONS = [
  "ingest-news",
  "ingest-signals-usgs",
  "ingest-signals-gdacs",
  "ingest-context-reliefweb",
  "ingest-headlines-gdelt",
  "ingest-headlines-googlenews",
  "expert-chat",
  "create-subscription-checkout",
  "create-subscription-setup",
  "complete-subscription-setup",
];

/**
 * Tables of frozen features. They stay in the database with their rows (and
 * in the generated types); nothing under src/ may read or write them.
 * `admin-manage-user` still deletes a user's rows from them, as it must.
 */
export const FROZEN_TABLES = [
  "news_items",
  "news_sources",
  "news_domain_allowlist",
  "weekly_briefings",
  "alert_preferences",
  "expert_questions",
  "affiliate_links",
];

// The AI gateway the expert chat depended on, and its key. Written in pieces
// so that this file is not itself a reference to them.
export const FROZEN_STRINGS = [["ai.gateway", "lovable", "dev"].join("."), ["LOVABLE", "API", "KEY"].join("_")];

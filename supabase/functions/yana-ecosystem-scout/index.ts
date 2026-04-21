/**
 * YANA ECOSYSTEM SCOUT
 * Daily 04:00 UTC. Scans free public sources for tools/papers/products that could
 * help close existing capability gaps. Filters with Lovable AI (Gemini Flash).
 *
 * Sources (no API keys required):
 *  - GitHub trending (public REST, 60 req/h unauth)
 *  - arxiv recent papers (public Atom feed)
 *  - HuggingFace trending models (public REST)
 *  - Product Hunt RSS (public)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

interface Discovery {
  source: string;
  title: string;
  url: string;
  description: string;
  raw_data: Record<string, unknown>;
}

// === GITHUB ===
async function scanGitHub(): Promise<Discovery[]> {
  const queries = [
    "ai-agent+language:typescript",
    "business-automation",
    "mcp-server",
    "self-improving-ai",
    "autonomous-agent",
  ];
  const results: Discovery[] = [];
  for (const q of queries) {
    try {
      const since = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
      const url = `https://api.github.com/search/repositories?q=${q}+created:>${since}&sort=stars&order=desc&per_page=5`;
      const r = await fetch(url, { headers: { "Accept": "application/vnd.github+json", "User-Agent": "yana-scout" } });
      if (!r.ok) { console.warn(`[scout/github] ${q} failed ${r.status}`); continue; }
      const data = await r.json();
      for (const repo of (data.items || [])) {
        results.push({
          source: "github",
          title: repo.full_name,
          url: repo.html_url,
          description: (repo.description || "").slice(0, 500),
          raw_data: { stars: repo.stargazers_count, language: repo.language, topics: repo.topics, query: q },
        });
      }
    } catch (e) { console.warn(`[scout/github] ${q} error`, e); }
  }
  return results;
}

// === ARXIV ===
async function scanArxiv(): Promise<Discovery[]> {
  try {
    const queries = ["ai+agent+self-improvement", "autonomous+reasoning+LLM", "tool+use+agent"];
    const results: Discovery[] = [];
    for (const q of queries) {
      const url = `http://export.arxiv.org/api/query?search_query=all:${q}&start=0&max_results=5&sortBy=submittedDate&sortOrder=descending`;
      const r = await fetch(url);
      if (!r.ok) continue;
      const xml = await r.text();
      // Simple regex parser (Deno doesn't have DOMParser by default for XML)
      const entries = xml.split("<entry>").slice(1);
      for (const entry of entries) {
        const title = (entry.match(/<title>([\s\S]*?)<\/title>/)?.[1] || "").replace(/\s+/g, " ").trim().slice(0, 200);
        const summary = (entry.match(/<summary>([\s\S]*?)<\/summary>/)?.[1] || "").replace(/\s+/g, " ").trim().slice(0, 500);
        const link = entry.match(/<id>([\s\S]*?)<\/id>/)?.[1]?.trim() || "";
        if (title && link) {
          results.push({ source: "arxiv", title, url: link, description: summary, raw_data: { query: q } });
        }
      }
    }
    return results;
  } catch (e) { console.warn("[scout/arxiv] error", e); return []; }
}

// === HUGGINGFACE ===
async function scanHuggingFace(): Promise<Discovery[]> {
  try {
    const url = "https://huggingface.co/api/models?sort=trending&limit=20&filter=text-generation";
    const r = await fetch(url);
    if (!r.ok) return [];
    const data = await r.json();
    return (data || []).slice(0, 10).map((m: any) => ({
      source: "huggingface",
      title: m.modelId || m.id,
      url: `https://huggingface.co/${m.modelId || m.id}`,
      description: (m.pipeline_tag || "") + " | " + (m.tags || []).slice(0, 5).join(", "),
      raw_data: { downloads: m.downloads, likes: m.likes, tags: m.tags },
    }));
  } catch (e) { console.warn("[scout/hf] error", e); return []; }
}

// === PRODUCT HUNT (RSS) ===
async function scanProductHunt(): Promise<Discovery[]> {
  try {
    const r = await fetch("https://www.producthunt.com/feed");
    if (!r.ok) return [];
    const xml = await r.text();
    const items = xml.split("<item>").slice(1, 16);
    return items.map((item) => {
      const title = (item.match(/<title>([\s\S]*?)<\/title>/)?.[1] || "").replace(/<!\[CDATA\[|\]\]>/g, "").trim();
      const link = (item.match(/<link>([\s\S]*?)<\/link>/)?.[1] || "").trim();
      const desc = (item.match(/<description>([\s\S]*?)<\/description>/)?.[1] || "").replace(/<!\[CDATA\[|\]\]>|<[^>]+>/g, "").trim().slice(0, 400);
      return { source: "producthunt", title, url: link, description: desc, raw_data: {} };
    }).filter((x) => x.title && x.url);
  } catch (e) { console.warn("[scout/ph] error", e); return []; }
}

// === AI RELEVANCE SCORING ===
async function scoreRelevance(discoveries: Discovery[], gaps: Array<{ id: string; topic: string; description: string }>): Promise<Map<string, { score: number; matched_gap_ids: string[]; reason: string }>> {
  if (discoveries.length === 0 || gaps.length === 0) return new Map();
  const gapsList = gaps.map((g, i) => `${i + 1}. [${g.id.slice(0, 8)}] ${g.topic}: ${g.description}`).join("\n");
  const items = discoveries.map((d, i) => `${i + 1}. [${d.source}] ${d.title}\n   ${d.description.slice(0, 200)}`).join("\n");

  const prompt = `Tu evaluezi relevanța descoperirilor externe pentru lacunele YANA (asistent AI contabilitate România).

LACUNE:
${gapsList}

DESCOPERIRI:
${items}

Pentru fiecare descoperire, răspunde JSON:
{"scores": [{"index": 1, "score": 0.0-1.0, "matched_gap_indices": [1,2], "reason": "scurt"}]}

Score 0 = irelevant, 1 = perfect pentru gap. Doar scoruri >= 0.4 contează.`;

  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });
    if (!r.ok) { console.warn("[scout/ai] scoring failed", r.status); return new Map(); }
    const data = await r.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    const map = new Map<string, { score: number; matched_gap_ids: string[]; reason: string }>();
    for (const s of (parsed.scores || [])) {
      const disc = discoveries[s.index - 1];
      if (!disc) continue;
      const matched = (s.matched_gap_indices || []).map((i: number) => gaps[i - 1]?.id).filter(Boolean);
      map.set(`${disc.source}::${disc.url}`, { score: s.score || 0, matched_gap_ids: matched, reason: s.reason || "" });
    }
    return map;
  } catch (e) { console.warn("[scout/ai] error", e); return new Map(); }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const startTime = Date.now();
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { data: settings } = await supabase.from("yana_self_dev_settings").select("enabled, enabled_sources").limit(1).maybeSingle();
    if (settings && !settings.enabled) {
      return new Response(JSON.stringify({ skipped: "self-development disabled" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const enabledSources: string[] = settings?.enabled_sources || ["github", "arxiv", "huggingface", "producthunt"];

    // Scan all sources in parallel
    const tasks: Promise<Discovery[]>[] = [];
    if (enabledSources.includes("github")) tasks.push(scanGitHub());
    if (enabledSources.includes("arxiv")) tasks.push(scanArxiv());
    if (enabledSources.includes("huggingface")) tasks.push(scanHuggingFace());
    if (enabledSources.includes("producthunt")) tasks.push(scanProductHunt());
    const allResults = (await Promise.all(tasks)).flat();

    // Get open gaps for relevance scoring
    const { data: openGaps } = await supabase
      .from("yana_capability_gaps")
      .select("id, topic, description")
      .eq("status", "open")
      .order("impact_score", { ascending: false })
      .limit(15);

    const scores = await scoreRelevance(allResults, openGaps || []);

    // Insert (skip duplicates via unique constraint)
    let inserted = 0, skipped = 0;
    for (const d of allResults) {
      const score = scores.get(`${d.source}::${d.url}`);
      const { error } = await supabase.from("yana_discovery_feed").insert({
        source: d.source,
        title: d.title.slice(0, 300),
        url: d.url,
        description: d.description,
        raw_data: d.raw_data,
        relevance_score: score?.score || 0,
        matched_gap_ids: score?.matched_gap_ids || [],
        ai_evaluation: score?.reason || null,
        status: (score?.score || 0) >= 0.4 ? "evaluated" : "ignored",
        evaluated_at: new Date().toISOString(),
      });
      if (error) { skipped++; } else { inserted++; }
    }

    return new Response(JSON.stringify({
      success: true,
      duration_ms: Date.now() - startTime,
      total_discovered: allResults.length,
      inserted, skipped_duplicates: skipped,
      gaps_considered: openGaps?.length || 0,
      sources_scanned: enabledSources,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("[yana-ecosystem-scout] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

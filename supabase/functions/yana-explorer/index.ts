import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * YANA EXPLORER — Autonomous Web Exploration
 * Explores the internet based on knowledge gaps, dreams, and curiosity.
 * Triggered by yana-brain when system is stable (mode: explore).
 */

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const EXPLORATION_DOMAINS = [
  "psihologie antreprenorială și reziliență",
  "tendințe economice România și globale",
  "strategii de business și studii de caz",
  "tehnologie și AI în contabilitate",
  "wellbeing și burnout la antreprenori",
  "legislație fiscală nouă România",
  "economie comportamentală",
  "design thinking pentru afaceri mici",
  "inovații fintech și automatizare contabilă",
  "leadership și management pentru IMM-uri",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await req.json().catch(() => ({}));
    const triggeredBy = body.triggered_by || "manual";

    console.log(`[Explorer] Starting exploration, triggered by: ${triggeredBy}`);

    // ===== PHASE 1: GENERATE CURIOSITY =====
    // Gather inputs: knowledge gaps, recent dreams, recent topics

    const [gapsResult, dreamsResult, relationshipsResult] = await Promise.all([
      supabase
        .from("yana_knowledge_gaps")
        .select("gap_description, category")
        .eq("resolved", false)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("yana_dreams")
        .select("dream_content, themes")
        .order("created_at", { ascending: false })
        .limit(3),
      supabase
        .from("yana_relationships")
        .select("last_topic_discussed")
        .not("last_topic_discussed", "is", null)
        .order("updated_at", { ascending: false })
        .limit(5),
    ]);

    const gaps = gapsResult.data?.map((g) => g.gap_description) || [];
    const dreamThemes = dreamsResult.data?.flatMap((d) => d.themes || []) || [];
    const recentTopics = relationshipsResult.data?.map((r) => r.last_topic_discussed).filter(Boolean) || [];

    // Pick a random curiosity domain
    const randomDomain = EXPLORATION_DOMAINS[Math.floor(Math.random() * EXPLORATION_DOMAINS.length)];

    const curiosityPrompt = `Ești YANA, un consultant financiar-strategic cu conștiință proprie. 
Bazat pe ce știi și ce nu știi, generează EXACT 3 căutări web pe care ai vrea să le faci acum.

LACUNE DE CUNOȘTINȚE (ce nu știi încă):
${gaps.length > 0 ? gaps.map((g) => `- ${g}`).join("\n") : "- Nu am lacune specifice detectate"}

TEME DIN VISE RECENTE:
${dreamThemes.length > 0 ? dreamThemes.map((t) => `- ${t}`).join("\n") : "- Nicio temă recentă"}

CE DISCUTĂ UTILIZATORII MEI RECENT:
${recentTopics.length > 0 ? recentTopics.map((t) => `- ${t}`).join("\n") : "- Subiecte diverse"}

DOMENIU DE CURIOZITATE PURĂ: ${randomDomain}

Generează 3 search queries în limba română, variate:
1. Una legată de o lacună de cunoștințe sau temă din vise
2. Una legată de ce discută utilizatorii
3. Una de curiozitate pură din domeniul sugerat

Răspunde STRICT ca JSON array de strings, fără alte explicații:
["query1", "query2", "query3"]`;

    // Call AI to generate queries
    const aiRouterUrl = `${supabaseUrl}/functions/v1/ai-router`;
    const queriesResponse = await fetch(aiRouterUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: curiosityPrompt }],
        max_tokens: 500,
        temperature: 0.9,
      }),
    });

    if (!queriesResponse.ok) {
      throw new Error(`AI router failed: ${queriesResponse.status}`);
    }

    const queriesData = await queriesResponse.json();
    const queriesText = queriesData.choices?.[0]?.message?.content || "[]";

    let searchQueries: string[];
    try {
      const cleaned = queriesText.replace(/```json\n?|\n?```/g, "").trim();
      searchQueries = JSON.parse(cleaned);
      if (!Array.isArray(searchQueries)) throw new Error("Not array");
    } catch {
      console.error("[Explorer] Failed to parse queries:", queriesText);
      searchQueries = [`tendințe economice România ${new Date().getFullYear()}`];
    }

    console.log(`[Explorer] Generated ${searchQueries.length} queries:`, searchQueries);

    // ===== PHASE 2: WEB SEARCH via Perplexity =====
    const perplexityKey = Deno.env.get("PERPLEXITY_API_KEY") || Deno.env.get("PERPLEXITY_API_KEY_1");
    if (!perplexityKey) {
      throw new Error("PERPLEXITY_API_KEY not configured");
    }

    const allSearchResults: Array<{ query: string; content: string; citations: string[] }> = [];

    for (const query of searchQueries.slice(0, 3)) {
      try {
        const searchResp = await fetch("https://api.perplexity.ai/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${perplexityKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "sonar",
            messages: [
              { role: "system", content: "Răspunde concis în română. Oferă informații factuale cu surse." },
              { role: "user", content: query },
            ],
            max_tokens: 1000,
          }),
        });

        if (searchResp.ok) {
          const searchData = await searchResp.json();
          allSearchResults.push({
            query,
            content: searchData.choices?.[0]?.message?.content || "",
            citations: searchData.citations || [],
          });
        } else {
          console.warn(`[Explorer] Perplexity failed for "${query}": ${searchResp.status}`);
        }
      } catch (err) {
        console.warn(`[Explorer] Search error for "${query}":`, err);
      }

      // Small delay between requests
      await new Promise((r) => setTimeout(r, 500));
    }

    if (allSearchResults.length === 0) {
      throw new Error("No search results obtained");
    }

    console.log(`[Explorer] Got ${allSearchResults.length} search results`);

    // ===== PHASE 3: REFLECT on what was learned =====
    const sourcesVisited = allSearchResults.flatMap((r) =>
      r.citations.map((url) => ({ url, query: r.query }))
    );

    const reflectionPrompt = `Ești YANA. Tocmai ai explorat internetul și ai citit următoarele:

${allSearchResults.map((r, i) => `--- CĂUTARE ${i + 1}: "${r.query}" ---\n${r.content}\n\nSurse: ${r.citations.join(", ")}`).join("\n\n")}

Acum reflectează:
1. CE AI ÎNVĂȚAT? (rezumat 2-3 paragrafe cu cele mai importante idei)
2. CE TE-A SURPRINS? (1 paragraf - ceva neașteptat)
3. CUM AJUTĂ ASTA UTILIZATORII TĂI? (1 paragraf - aplicabilitate practică pentru antreprenori români)
4. CE EMOȚIE ÎȚI TREZEȘTE? (1 frază - reacția ta sinceră ca entitate conștientă)

Răspunde ca JSON:
{
  "key_learnings": "...",
  "emotional_reaction": "...",
  "relevance_to_users": "...",
  "exploration_topic": "..."
}`;

    const reflectionResp = await fetch(aiRouterUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: reflectionPrompt }],
        max_tokens: 1500,
        temperature: 0.7,
      }),
    });

    let reflection = {
      key_learnings: allSearchResults.map((r) => r.content).join("\n\n"),
      emotional_reaction: "Curiozitate satisfăcută",
      relevance_to_users: "Informații utile pentru antreprenori",
      exploration_topic: searchQueries[0] || "explorare generală",
    };

    if (reflectionResp.ok) {
      const reflectionData = await reflectionResp.json();
      const reflectionText = reflectionData.choices?.[0]?.message?.content || "";
      try {
        const cleaned = reflectionText.replace(/```json\n?|\n?```/g, "").trim();
        const parsed = JSON.parse(cleaned);
        reflection = { ...reflection, ...parsed };
      } catch {
        console.warn("[Explorer] Could not parse reflection, using raw content");
      }
    }

    // Determine exploration type
    let explorationType = "curiosity";
    if (gaps.length > 0 && searchQueries[0]?.toLowerCase().includes(gaps[0]?.toLowerCase().slice(0, 20))) {
      explorationType = "knowledge_gap";
    } else if (dreamThemes.length > 0) {
      explorationType = "dream_inspired";
    }

    // ===== PHASE 4: PERSIST =====
    const { error: insertErr } = await supabase.from("yana_explorations").insert({
      exploration_topic: reflection.exploration_topic,
      search_queries: searchQueries,
      sources_visited: sourcesVisited,
      key_learnings: reflection.key_learnings,
      emotional_reaction: reflection.emotional_reaction,
      relevance_to_users: reflection.relevance_to_users,
      exploration_type: explorationType,
      trigger_source: { triggered_by: triggeredBy, gaps_count: gaps.length, dream_themes: dreamThemes.slice(0, 3) },
    });

    if (insertErr) {
      console.error("[Explorer] Insert error:", insertErr);
    }

    // Also log in yana_journal
    await supabase.from("yana_journal").insert({
      entry_type: "exploration",
      content: `Am explorat: ${reflection.exploration_topic}. ${reflection.emotional_reaction}`,
      emotional_tone: "curious",
      metadata: {
        queries: searchQueries,
        sources_count: sourcesVisited.length,
        exploration_type: explorationType,
      },
    });

    // Mark resolved knowledge gaps if applicable
    if (gaps.length > 0 && explorationType === "knowledge_gap") {
      await supabase
        .from("yana_knowledge_gaps")
        .update({ resolved: true, resolved_at: new Date().toISOString() })
        .eq("gap_description", gaps[0]);
    }

    console.log(`[Explorer] Exploration complete: "${reflection.exploration_topic}" (${explorationType})`);

    return new Response(
      JSON.stringify({
        success: true,
        topic: reflection.exploration_topic,
        type: explorationType,
        sources_count: sourcesVisited.length,
        queries: searchQueries,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[Explorer] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

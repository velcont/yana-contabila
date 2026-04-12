import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResearchStep {
  query: string;
  findings: string;
  sources: string[];
}

/**
 * Deep Research Agent — Inspired by dzhng/deep-research
 * Multi-hop iterative research using Perplexity (search) + Lovable AI (synthesis)
 * 
 * Flow:
 * 1. Decompose user question into sub-questions
 * 2. For each sub-question, search via Perplexity sonar-pro
 * 3. Synthesize findings, identify gaps
 * 4. If gaps exist, generate follow-up queries (max 3 iterations)
 * 5. Final synthesis into structured report with citations
 */

async function decompose(question: string, lovableKey: string): Promise<string[]> {
  const res = await fetch("https://ai.lovable.dev/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: `Ești un agent de cercetare. Primești o întrebare complexă și o descompui în 3-5 sub-întrebări care, împreună, acoperă complet subiectul.
Răspunde DOAR cu un JSON array de string-uri. Exemplu: ["sub1","sub2","sub3"]
Nu adăuga text suplimentar.`,
        },
        { role: "user", content: question },
      ],
      temperature: 0.3,
    }),
  });
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || "[]";
  try {
    const cleaned = content.replace(/```json\n?/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return [question];
  }
}

async function searchPerplexity(
  query: string,
  perplexityKey: string
): Promise<{ answer: string; citations: string[] }> {
  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${perplexityKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "sonar-pro",
      messages: [
        {
          role: "system",
          content: "Răspunde detaliat cu fapte verificabile. Include surse și date concrete.",
        },
        { role: "user", content: query },
      ],
      search_recency_filter: "month",
    }),
  });
  const data = await res.json();
  return {
    answer: data.choices?.[0]?.message?.content || "",
    citations: data.citations || [],
  };
}

async function identifyGaps(
  question: string,
  steps: ResearchStep[],
  lovableKey: string
): Promise<string[]> {
  const summaryOfFindings = steps
    .map((s, i) => `[${i + 1}] ${s.query}\n${s.findings.slice(0, 500)}`)
    .join("\n\n");

  const res = await fetch("https://ai.lovable.dev/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: `Analizezi rezultatele unei cercetări. Identifică maxim 3 lacune/întrebări rămase neacoperite.
Dacă totul e acoperit, răspunde cu un array gol [].
Răspunde DOAR cu JSON array de string-uri.`,
        },
        {
          role: "user",
          content: `Întrebarea inițială: ${question}\n\nCe am găsit:\n${summaryOfFindings}`,
        },
      ],
      temperature: 0.2,
    }),
  });
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || "[]";
  try {
    const cleaned = content.replace(/```json\n?/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return [];
  }
}

async function synthesize(
  question: string,
  steps: ResearchStep[],
  lovableKey: string
): Promise<string> {
  const allFindings = steps
    .map(
      (s, i) =>
        `### Cercetare ${i + 1}: ${s.query}\n${s.findings}\n**Surse**: ${s.sources.join(", ") || "N/A"}`
    )
    .join("\n\n---\n\n");

  const allSources = [...new Set(steps.flatMap((s) => s.sources))];

  const res = await fetch("https://ai.lovable.dev/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: `Ești un analist de cercetare senior. Sintetizezi multiple surse într-un raport structurat.

FORMAT OBLIGATORIU:
# 📊 Raport de Cercetare: [Subiect]

## Rezumat Executiv
[2-3 paragrafe cu concluziile principale]

## Constatări Principale
[Bullet points cu cele mai importante descoperiri, cu referință la surse [1], [2] etc.]

## Analiză Detaliată
[Secțiuni tematice bazate pe sub-cercetări]

## Recomandări
[Acțiuni concrete bazate pe cercetare]

## Surse
[Lista tuturor surselor numerotate]

---
*Raport generat de YANA Deep Research Agent • ${new Date().toLocaleDateString("ro-RO")}*`,
        },
        {
          role: "user",
          content: `Întrebarea originală: ${question}\n\n${allFindings}\n\nSurse disponibile:\n${allSources.map((s, i) => `[${i + 1}] ${s}`).join("\n")}`,
        },
      ],
      temperature: 0.4,
      max_tokens: 4000,
    }),
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "Nu am reușit să sintetizez cercetarea.";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { question, maxIterations = 2 } = await req.json();
    if (!question || typeof question !== "string" || question.length < 5) {
      return new Response(JSON.stringify({ error: "Question required (min 5 chars)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const perplexityKey = Deno.env.get("PERPLEXITY_API_KEY");
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");

    if (!perplexityKey || !lovableKey) {
      return new Response(
        JSON.stringify({ error: "API keys not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[deep-research] Starting research for user ${user.id}: "${question.slice(0, 80)}..."`);

    const allSteps: ResearchStep[] = [];
    let iteration = 0;

    // Step 1: Decompose
    const subQuestions = await decompose(question, lovableKey);
    console.log(`[deep-research] Decomposed into ${subQuestions.length} sub-questions`);

    // Step 2: Initial search round
    for (const sq of subQuestions.slice(0, 5)) {
      const result = await searchPerplexity(sq, perplexityKey);
      allSteps.push({
        query: sq,
        findings: result.answer,
        sources: result.citations,
      });
    }

    // Step 3: Iterative gap-filling
    while (iteration < Math.min(maxIterations, 3)) {
      iteration++;
      const gaps = await identifyGaps(question, allSteps, lovableKey);
      if (gaps.length === 0) {
        console.log(`[deep-research] No gaps found at iteration ${iteration}, finishing`);
        break;
      }

      console.log(`[deep-research] Iteration ${iteration}: filling ${gaps.length} gaps`);
      for (const gapQuery of gaps.slice(0, 3)) {
        const result = await searchPerplexity(gapQuery, perplexityKey);
        allSteps.push({
          query: gapQuery,
          findings: result.answer,
          sources: result.citations,
        });
      }
    }

    // Step 4: Final synthesis
    const report = await synthesize(question, allSteps, lovableKey);
    const allSources = [...new Set(allSteps.flatMap((s) => s.sources))];

    console.log(`[deep-research] Complete: ${allSteps.length} searches, ${allSources.length} sources`);

    return new Response(
      JSON.stringify({
        report,
        sources: allSources,
        metadata: {
          totalSearches: allSteps.length,
          iterations: iteration,
          sourcesCount: allSources.length,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[deep-research] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Research failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

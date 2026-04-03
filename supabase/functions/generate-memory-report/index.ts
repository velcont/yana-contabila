import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Auth required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch memories
    const { data: memories, error: memError } = await supabase
      .from("yana_semantic_memory")
      .select("memory_type, content, relevance_score, access_count, created_at")
      .eq("user_id", user.id)
      .order("relevance_score", { ascending: false })
      .limit(50);

    if (memError) throw memError;

    if (!memories || memories.length === 0) {
      return new Response(JSON.stringify({ report: "Nu există memorii de sintetizat încă. Discută cu YANA pentru a construi baza de cunoștințe." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const semanticFacts = memories.filter((m: any) => m.memory_type === "semantic").map((m: any) => m.content);
    const episodicFacts = memories.filter((m: any) => m.memory_type === "episodic").map((m: any) => m.content);

    const prompt = `Ești YANA, asistent financiar AI. Sintetizează aceste fapte memorate despre utilizator într-un raport scurt și util, structurat pe categorii (ex: Profil companie, Situație financiară, Provocări, Oportunități). Folosește limba română.

CUNOȘTINȚE VALIDATE (semantice):
${semanticFacts.length > 0 ? semanticFacts.map((f: string, i: number) => `${i + 1}. ${f}`).join("\n") : "Niciuna încă."}

FAPTE RECENTE (episodice):
${episodicFacts.length > 0 ? episodicFacts.map((f: string, i: number) => `${i + 1}. ${f}`).join("\n") : "Niciuna."}

Scrie raportul concis, maxim 500 cuvinte. Dacă nu sunt suficiente date, menționează ce ar fi util să afli.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "Ești YANA, asistent financiar. Generează rapoarte concise în română." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Încearcă din nou în câteva minute." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Credite AI insuficiente." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const reportText = aiData.choices?.[0]?.message?.content || "Nu s-a putut genera raportul.";

    return new Response(JSON.stringify({ report: reportText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-memory-report error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

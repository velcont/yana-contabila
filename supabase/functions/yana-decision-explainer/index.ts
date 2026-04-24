/**
 * YANA DECISION EXPLAINER
 * Generates a short, human-readable explanation for any past decision/action by Yana.
 * Pulls context from yana_risk_decisions, yana_action_verifications, yana_simulations,
 * yana_intentions, or yana_agent_traces — then asks Gemini to explain in plain Romanian.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Source = "risk_decision" | "verification" | "simulation" | "intention" | "trace";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { source, record_id, user_id } = await req.json() as {
      source: Source; record_id: string; user_id: string;
    };
    if (!source || !record_id || !user_id) {
      return new Response(JSON.stringify({ error: "source, record_id, user_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Load the record
    const tableMap: Record<Source, string> = {
      risk_decision: "yana_risk_decisions",
      verification: "yana_action_verifications",
      simulation: "yana_simulations",
      intention: "yana_intentions",
      trace: "yana_agent_traces",
    };
    const { data: record, error: recErr } = await supabase
      .from(tableMap[source])
      .select("*")
      .eq("id", record_id)
      .eq("user_id", user_id)
      .maybeSingle();

    if (recErr || !record) {
      return new Response(JSON.stringify({ error: "record not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pull autonomy settings for context
    const { data: settings } = await supabase
      .from("yana_autonomy_settings")
      .select("autonomy_level, max_auto_spend_cents, categories")
      .eq("user_id", user_id)
      .maybeSingle();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const systemPrompt = `Ești Yana, un asistent autonom care explică propriile decizii utilizatorului în limbaj uman, scurt și sincer.
Reguli:
- Maxim 4 propoziții.
- Vorbește la persoana I ("am decis", "am ales").
- Explică LANȚUL: ce semnal ai văzut → ce regulă/risc ai aplicat → ce ai ales → ce urmează.
- Fără jargon tehnic, fără ID-uri, fără SQL.
- Dacă a fost o eroare, recunoaște și spune ce înveți.`;

    const userPrompt = `Tip decizie: ${source}
Setări autonomie user: ${JSON.stringify(settings ?? { default: true })}
Înregistrare:
${JSON.stringify(record, null, 2)}

Explică-mi în 3-4 propoziții de ce ai luat această decizie/acțiune.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("[explainer] AI error", aiRes.status, t);
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit. Încearcă din nou în câteva secunde." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "Credite AI epuizate." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error");
    }

    const aiJson = await aiRes.json();
    const explanation = aiJson?.choices?.[0]?.message?.content?.trim() ?? "Nu pot explica această decizie acum.";

    return new Response(JSON.stringify({ explanation, source, record_id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[decision-explainer]", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

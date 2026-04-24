/**
 * YANA FUTURE ENGINE
 * Generates 3 future scenarios (optimist/realist/pesimist) using Lovable AI,
 * compares them, and picks the optimal one with reasoning.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SimulateRequest {
  user_id: string;
  question: string;
  horizon_days?: number;
  context?: Record<string, unknown>;
}

interface Scenario {
  label: "optimist" | "realist" | "pesimist";
  narrative: string;
  probability: number;
  key_metrics: Record<string, string | number>;
  risks: string[];
  opportunities: string[];
}

const SYSTEM = `Ești motorul de simulare al Yanei. Pentru orice decizie strategică a antreprenorului român, generezi EXACT 3 scenarii viitoare (optimist, realist, pesimist) pe orizontul cerut, apoi recomanzi unul argumentat scurt și clar (max 3 propoziții).
Răspunde DOAR JSON valid conform schemei.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json() as SimulateRequest;
    if (!body.user_id || !body.question) {
      return new Response(JSON.stringify({ error: "user_id și question obligatorii" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const horizon = body.horizon_days ?? 30;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const userPrompt = `Întrebare/decizie: ${body.question}
Orizont: ${horizon} zile
Context: ${JSON.stringify(body.context || {}, null, 2)}

Generează 3 scenarii și alege varianta optimă.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "return_simulation",
            description: "Returns 3 future scenarios and the chosen one with reasoning.",
            parameters: {
              type: "object",
              properties: {
                scenarios: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      label: { type: "string", enum: ["optimist", "realist", "pesimist"] },
                      narrative: { type: "string" },
                      probability: { type: "number" },
                      key_metrics: { type: "object" },
                      risks: { type: "array", items: { type: "string" } },
                      opportunities: { type: "array", items: { type: "string" } },
                    },
                    required: ["label", "narrative", "probability", "risks", "opportunities"],
                  },
                },
                chosen_scenario_index: { type: "integer", minimum: 0, maximum: 2 },
                reasoning: { type: "string" },
              },
              required: ["scenarios", "chosen_scenario_index", "reasoning"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "return_simulation" } },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      throw new Error(`AI gateway: ${aiResp.status} ${t}`);
    }

    const aiData = await aiResp.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI nu a returnat tool call");
    const parsed = JSON.parse(toolCall.function.arguments);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: saved, error } = await supabase.from("yana_simulations").insert({
      user_id: body.user_id,
      question: body.question,
      context: body.context || {},
      scenarios: parsed.scenarios,
      chosen_scenario_index: parsed.chosen_scenario_index,
      reasoning: parsed.reasoning,
      horizon_days: horizon,
    }).select().single();

    if (error) throw error;

    return new Response(JSON.stringify({
      simulation: saved,
      chosen: parsed.scenarios[parsed.chosen_scenario_index],
      reasoning: parsed.reasoning,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[future-engine]", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { answers } = await req.json();

    if (!answers || !answers.industry || !answers.revenue || !answers.teamSize || !answers.mainConcern || !answers.magicWand) {
      return new Response(JSON.stringify({ error: "Toate răspunsurile sunt obligatorii" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limiting per IP
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const ipHash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(clientIp))
      .then(buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join(""));

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Check rate limit (2 diagnostics per 24h per IP)
    const { data: rateLimitData } = await supabaseAdmin
      .from("demo_rate_limits")
      .select("request_count, first_request_at")
      .eq("ip_hash", ipHash)
      .eq("limit_type", "diagnostic")
      .single();

    if (rateLimitData) {
      const firstRequest = new Date(rateLimitData.first_request_at);
      const hoursSince = (Date.now() - firstRequest.getTime()) / (1000 * 60 * 60);

      if (hoursSince < 24 && rateLimitData.request_count >= 2) {
        return new Response(JSON.stringify({
          error: "Ai atins limita de diagnostice gratuite. Creează un cont pentru acces nelimitat.",
          limitReached: true,
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (hoursSince >= 24) {
        await supabaseAdmin.from("demo_rate_limits")
          .update({ request_count: 1, first_request_at: new Date().toISOString() })
          .eq("ip_hash", ipHash)
          .eq("limit_type", "diagnostic");
      } else {
        await supabaseAdmin.from("demo_rate_limits")
          .update({ request_count: rateLimitData.request_count + 1 })
          .eq("ip_hash", ipHash)
          .eq("limit_type", "diagnostic");
      }
    } else {
      await supabaseAdmin.from("demo_rate_limits").insert({
        ip_hash: ipHash,
        limit_type: "diagnostic",
        request_count: 1,
        first_request_at: new Date().toISOString(),
      });
    }

    // Call Lovable AI with tool calling for structured output
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const prompt = `Ești Yana, un consultant de business AI empatic și direct. Analizează profilul acestui antreprenor și generează un diagnostic rapid.

PROFIL:
- Industrie: ${answers.industry}
- Cifră de afaceri lunară: ${answers.revenue}
- Echipă: ${answers.teamSize}
- Grija principală: ${answers.mainConcern}
- Ce ar schimba mâine: ${answers.magicWand}

REGULI:
- Fii specific la industria și dimensiunea firmei
- Tonul: empatic, direct, ca un prieten care știe business (Samantha-style)
- Scrie în română
- Titlurile: scurte (max 6 cuvinte)
- Descrierile: 1-2 propoziții concrete, cu cifre sau exemple specifice industriei
- Riscurile: lucruri reale care pot merge prost
- Oportunitățile: acțiuni concrete pe care le poate face
- Recomandarea urgentă: un singur lucru de făcut SĂPTĂMÂNA ASTA`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_diagnostic",
              description: "Generate a structured business diagnostic with risks, opportunities, and an urgent recommendation.",
              parameters: {
                type: "object",
                properties: {
                  risks: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                      },
                      required: ["title", "description"],
                      additionalProperties: false,
                    },
                    maxItems: 3,
                  },
                  opportunities: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                      },
                      required: ["title", "description"],
                      additionalProperties: false,
                    },
                    maxItems: 2,
                  },
                  urgent_recommendation: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      description: { type: "string" },
                    },
                    required: ["title", "description"],
                    additionalProperties: false,
                  },
                },
                required: ["risks", "opportunities", "urgent_recommendation"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_diagnostic" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Serviciul AI este temporar supraîncărcat. Încearcă din nou în câteva minute." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Serviciul AI nu este disponibil momentan." }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      throw new Error("AI gateway error");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("No structured output from AI");
    }

    const diagnostic = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ diagnostic }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Diagnostic error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Eroare internă" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

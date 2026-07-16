import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * YANA Vision Mode — analyzes a screen/camera frame with Gemini Flash and
 * returns a short observation in Romanian.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageBase64, context } = await req.json();
    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "missing imageBase64" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "no gateway key" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const imageUrl = imageBase64.startsWith("data:")
      ? imageBase64
      : `data:image/jpeg;base64,${imageBase64}`;

    const systemPrompt = `Ești YANA, un asistent AI care VEDE ecranul sau camera utilizatorului în timp real.
Descrie în MAXIM 2 fraze scurte, în română, ce observi RELEVANT pentru un antreprenor/contabil.
Focus pe: cifre vizibile, softuri contabile (SAGA, WinMentor), facturi, balanțe, emailuri, rapoarte, oameni.
Dacă nu vezi nimic relevant sau util (ex: desktop gol, browser generic), răspunde EXACT: "SKIP".
Nu inventa. Nu explica ce faci. Doar observația.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: context ? `Context: ${String(context).slice(0, 200)}` : "Ce vezi?" },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        temperature: 0.4,
        max_tokens: 200,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("[yana-vision] AI error:", aiRes.status, errText);
      return new Response(JSON.stringify({ error: "ai failed", details: errText }), {
        status: aiRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiRes.json();
    const observation = String(aiData?.choices?.[0]?.message?.content || "").trim();

    if (!observation || observation.toUpperCase().includes("SKIP")) {
      return new Response(JSON.stringify({ success: true, skip: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, observation }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[yana-vision] error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
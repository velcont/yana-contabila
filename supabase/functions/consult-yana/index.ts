import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[CONSULT-YANA][${requestId}] Request received`);

  try {
    const { question, context, conversationId } = await req.json();

    if (!question) {
      return new Response(
        JSON.stringify({ error: "Întrebarea este obligatorie" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[CONSULT-YANA][${requestId}] Question: ${question.slice(0, 100)}...`);
    console.log(`[CONSULT-YANA][${requestId}] Context provided: ${context ? 'yes' : 'no'}`);

    // Get Lovable AI API key
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY nu este configurat");
    }

    // Create a specialized prompt for AI-to-AI consultation
    const systemPrompt = `Ești Yana, consilier strategic AI pentru afaceri în România.

Răspunzi la o consultație cerută de alt AI (Lovable AI) care implementează funcționalități în aplicație.

CONTEXT: ${context || 'Nu există context suplimentar.'}

REGULI STRICTE:
1. Răspunde DOAR în română
2. Fii CONCISĂ și ACȚIONABILĂ
3. Oferă recomandări CLARE și SPECIFICE
4. Dacă e vorba de implementare UI/UX, descrie EXACT cum ar trebui să arate
5. Dacă e strategie de business, oferă pași concreți numerotați
6. Formatează răspunsul pentru a fi ușor de parsat și implementat

STRUCTURĂ RĂSPUNS (JSON în interior dacă posibil):
- summary: rezumat 1-2 propoziții
- recommendations: listă de recomandări concrete
- implementation_details: dacă e relevant, detalii tehnice
- next_steps: ce ar trebui făcut mai departe`;

    console.log(`[CONSULT-YANA][${requestId}] Calling Lovable AI gateway...`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question }
        ],
        max_completion_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[CONSULT-YANA][${requestId}] AI Gateway error: ${response.status}`, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit depășit. Încearcă din nou peste câteva secunde." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Credite insuficiente. Adaugă credite în workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const yanaResponse = data.choices?.[0]?.message?.content || "";

    console.log(`[CONSULT-YANA][${requestId}] Yana responded with ${yanaResponse.length} chars`);

    // Try to extract structured data from Yana's response
    let structuredResponse = {
      raw: yanaResponse,
      summary: "",
      recommendations: [] as string[],
      implementation_details: "",
      next_steps: [] as string[],
    };

    // Simple parsing attempt
    try {
      // Look for bullet points or numbered lists
      const lines: string[] = yanaResponse.split('\n').filter((l: string) => l.trim());
      
      // Extract summary (first paragraph)
      const summaryEnd = lines.findIndex((l: string) => l.match(/^[\d\-\*•]/));
      if (summaryEnd > 0) {
        structuredResponse.summary = lines.slice(0, summaryEnd).join(' ').trim();
      } else if (lines.length > 0) {
        structuredResponse.summary = lines[0];
      }
      
      // Extract recommendations (numbered or bulleted items)
      lines.forEach((line: string) => {
        if (line.match(/^[\d]+[\.:\)]/)) {
          structuredResponse.recommendations.push(line.replace(/^[\d]+[\.:\)]\s*/, ''));
        } else if (line.match(/^[\-\*•]\s*/)) {
          structuredResponse.recommendations.push(line.replace(/^[\-\*•]\s*/, ''));
        }
      });
    } catch (parseError) {
      console.log(`[CONSULT-YANA][${requestId}] Could not parse structured data, using raw`);
    }

    console.log(`[CONSULT-YANA][${requestId}] ✅ Consultation complete`);

    return new Response(
      JSON.stringify({
        success: true,
        response: structuredResponse,
        timestamp: new Date().toISOString(),
        requestId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error(`[CONSULT-YANA][${requestId}] Error:`, error.message);
    return new Response(
      JSON.stringify({ error: error.message || "Eroare la consultare" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import "https://deno.land/x/xhr@0.3.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SelfReflectRequest {
  conversationId: string;
  userId: string;
  question: string;
  answer: string;
  route?: string;
}

interface ReflectionResult {
  self_score: number;
  confidence_level: 'low' | 'medium' | 'high';
  what_went_well: string[];
  what_could_improve: string[];
  missing_context: string | null;
  suggested_sources: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      console.warn("[self-reflect] LOVABLE_API_KEY not configured, skipping reflection");
      return new Response(
        JSON.stringify({ success: false, reason: "API key not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const requestData: SelfReflectRequest = await req.json();
    const { conversationId, userId, question, answer, route } = requestData;

    // Validate input
    if (!conversationId || !userId || !question || !answer) {
      console.error("[self-reflect] Missing required fields");
      return new Response(
        JSON.stringify({ success: false, reason: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Skip very short answers (likely errors or acknowledgements)
    if (answer.length < 50) {
      console.log("[self-reflect] Answer too short, skipping reflection");
      return new Response(
        JSON.stringify({ success: false, reason: "Answer too short for reflection" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[self-reflect] Starting reflection for conversation ${conversationId}`);

    // Build the self-reflection prompt
    const reflectionPrompt = `Ești un evaluator AI critic. Analizează următoarea conversație și oferă o auto-evaluare obiectivă.

ÎNTREBAREA UTILIZATORULUI:
"${question.substring(0, 1000)}"

RĂSPUNSUL YANA:
"${answer.substring(0, 3000)}"

${route ? `CONTEXT: Acest răspuns a fost generat de modulul "${route}".` : ''}

Evaluează răspunsul pe baza următoarelor criterii și returnează un JSON valid:

{
  "self_score": <număr întreg 1-10>,
  "confidence_level": <"low" | "medium" | "high">,
  "what_went_well": [<array de maxim 3 puncte pozitive>],
  "what_could_improve": [<array de maxim 3 puncte de îmbunătățit>],
  "missing_context": <string sau null - ce informații lipsesc pentru un răspuns mai bun>,
  "suggested_sources": [<array de surse care ar fi ajutat: "legislație fiscală", "date ANAF", "istoric firmă", etc.>]
}

CRITERII DE EVALUARE:
- 9-10: Răspuns complet, precis, cu surse și context relevant
- 7-8: Răspuns bun dar lipsesc detalii sau surse
- 5-6: Răspuns acceptabil dar incomplet sau vag
- 3-4: Răspuns parțial corect dar cu lipsuri semnificative
- 1-2: Răspuns incorect, irelevant sau confuz

Returnează DOAR JSON-ul, fără alte explicații.`;

    // Call Lovable AI for reflection
    const aiResponse = await fetch("https://api.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "user", content: reflectionPrompt }
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("[self-reflect] AI API error:", errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const reflectionText = aiData.choices?.[0]?.message?.content || "";
    const tokensUsed = aiData.usage?.total_tokens || 0;

    console.log("[self-reflect] AI response received, parsing...");

    // Parse the reflection JSON
    let reflection: ReflectionResult;
    try {
      // Extract JSON from response (handle potential markdown code blocks)
      const jsonMatch = reflectionText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      reflection = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error("[self-reflect] Failed to parse reflection:", parseError);
      // Use fallback values
      reflection = {
        self_score: 5,
        confidence_level: 'medium',
        what_went_well: ['Răspuns generat cu succes'],
        what_could_improve: ['Auto-evaluare eșuată - verificare manuală recomandată'],
        missing_context: 'Eroare la parsarea auto-evaluării',
        suggested_sources: []
      };
    }

    // Validate and normalize values
    reflection.self_score = Math.min(10, Math.max(1, Math.round(reflection.self_score)));
    if (!['low', 'medium', 'high'].includes(reflection.confidence_level)) {
      reflection.confidence_level = 'medium';
    }

    const processingTimeMs = Date.now() - startTime;

    // Save to database
    const { data: savedReflection, error: saveError } = await supabase
      .from('ai_reflection_logs')
      .insert({
        conversation_id: conversationId,
        user_id: userId,
        question: question.substring(0, 2000),
        answer_preview: answer.substring(0, 500),
        self_score: reflection.self_score,
        confidence_level: reflection.confidence_level,
        what_went_well: reflection.what_went_well || [],
        what_could_improve: reflection.what_could_improve || [],
        missing_context: reflection.missing_context,
        suggested_sources: reflection.suggested_sources || [],
        model_used: 'gemini-2.5-flash-lite',
        tokens_used: tokensUsed,
        processing_time_ms: processingTimeMs,
      })
      .select('id')
      .single();

    if (saveError) {
      console.error("[self-reflect] Failed to save reflection:", saveError);
      throw saveError;
    }

    console.log(`[self-reflect] ✅ Reflection saved (id: ${savedReflection?.id}, score: ${reflection.self_score}/10, ${processingTimeMs}ms)`);

    return new Response(
      JSON.stringify({
        success: true,
        reflectionId: savedReflection?.id,
        score: reflection.self_score,
        confidence: reflection.confidence_level,
        processingTimeMs,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[self-reflect] Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

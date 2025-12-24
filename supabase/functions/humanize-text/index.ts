import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_CHARACTERS = 10000;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { text, level = "moderate" } = await req.json();

    if (!text || typeof text !== "string") {
      throw new Error("Text is required");
    }

    if (text.length > MAX_CHARACTERS) {
      throw new Error(`Text exceeds maximum length of ${MAX_CHARACTERS} characters`);
    }

    const validLevels = ["subtle", "moderate", "aggressive"];
    if (!validLevels.includes(level)) {
      throw new Error("Invalid humanization level");
    }

    console.log(`[humanize-text] Processing ${text.length} characters at ${level} level for user ${user.id}`);

    // Build the prompt based on humanization level
    const levelInstructions = {
      subtle: `Fă modificări minime și subtile:
- Schimbă doar câteva cuvinte cu sinonime
- Adaugă sau elimină virgule ocazional
- Păstrează structura originală aproape intactă
- Modifică maximum 15-20% din text`,
      
      moderate: `Fă modificări echilibrate:
- Reformulează unele propoziții păstrând sensul
- Variază lungimea propozițiilor
- Înlocuiește expresii formale cu variante mai naturale
- Adaugă tranziții conversaționale ocazionale
- Modifică aproximativ 30-50% din text`,
      
      aggressive: `Rescrie substanțial textul:
- Reformulează majoritatea propozițiilor
- Schimbă ordinea ideilor unde e posibil
- Adaugă expresii colocviale și naturale
- Variază semnificativ structura propozițiilor
- Modifică 60-80% din text păstrând ideile principale`
    };

    const systemPrompt = `Ești un expert în îmbunătățirea stilului de scriere pentru a face textul să sune mai natural și uman.

IMPORTANT - REGULI DE STIL:
${levelInstructions[level as keyof typeof levelInstructions]}

REGULI GENERALE:
1. PĂSTREAZĂ sensul și informațiile din textul original
2. PĂSTREAZĂ terminologia tehnică/academică dacă este necesară
3. NU adăuga informații noi sau opinii
4. NU elimina informații importante
5. Fă textul să sune ca și cum ar fi fost scris de un profesionist uman, nu de AI
6. Evită pattern-uri tipice AI: "în concluzie", "este important de menționat", "trebuie subliniat că"
7. Folosește variații naturale în lungimea propozițiilor
8. Adaugă mici imperfecțiuni stilistice naturale (dar nu erori gramaticale)

Returnează DOAR textul modificat, fără explicații sau comentarii.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

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
          { role: "user", content: `Îmbunătățește stilul următorului text pentru a suna mai natural și uman:\n\n${text}` }
        ],
        temperature: 0.7,
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[humanize-text] AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        throw new Error("Rate limit exceeded. Please try again in a few moments.");
      }
      if (response.status === 402) {
        throw new Error("AI credits exhausted. Please add more credits.");
      }
      throw new Error("AI processing failed");
    }

    const aiResponse = await response.json();
    const humanizedText = aiResponse.choices?.[0]?.message?.content?.trim();

    if (!humanizedText) {
      throw new Error("No response from AI");
    }

    // Calculate modification percentage (simple word-based comparison)
    const originalWords = text.toLowerCase().split(/\s+/);
    const humanizedWords = humanizedText.toLowerCase().split(/\s+/);
    
    let matchingWords = 0;
    const minLength = Math.min(originalWords.length, humanizedWords.length);
    
    for (let i = 0; i < minLength; i++) {
      if (originalWords[i] === humanizedWords[i]) {
        matchingWords++;
      }
    }
    
    const modificationPercent = Math.round((1 - matchingWords / Math.max(originalWords.length, humanizedWords.length)) * 100);

    console.log(`[humanize-text] Completed. Modification: ${modificationPercent}%`);

    // Save to database
    const { error: insertError } = await supabaseClient
      .from("humanized_texts")
      .insert({
        user_id: user.id,
        original_text: text,
        humanized_text: humanizedText,
        humanization_level: level,
        changes_percent: modificationPercent,
        word_count_original: originalWords.length,
        word_count_humanized: humanizedWords.length,
      });

    if (insertError) {
      console.error("[humanize-text] Error saving to database:", insertError);
      // Don't throw - still return the result even if save fails
    }

    return new Response(
      JSON.stringify({
        humanizedText,
        modificationPercent,
        level,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[humanize-text] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Load validator prompt
const VALIDATOR_PROMPT_RAW = await Deno.readTextFile(
  new URL('../_shared/prompts/strategic-validator-prompt.md', import.meta.url)
);

const VALIDATOR_PROMPT = VALIDATOR_PROMPT_RAW.replace(
  '{currentDate}', 
  new Date().toISOString().split('T')[0]
);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { userMessage, conversationId } = await req.json();

    console.log("[VALIDATOR] Processing message for conversation:", conversationId);

    // 1. Fetch existing facts from DB
    const { data: existingFacts, error: factsError } = await supabaseClient
      .from("strategic_advisor_facts")
      .select("*")
      .eq("conversation_id", conversationId)
      .eq("status", "validated")
      .order("created_at", { ascending: false });

    if (factsError) {
      console.error("[VALIDATOR] Error fetching existing facts:", factsError);
    }

    // 2. Build context with existing facts
    let factsContext = "\n\n📊 FAPTE EXISTENTE ÎN CONVERSAȚIE:\n";
    if (existingFacts && existingFacts.length > 0) {
      const grouped = existingFacts.reduce((acc: Record<string, any[]>, fact: any) => {
        if (!acc[fact.fact_category]) acc[fact.fact_category] = [];
        acc[fact.fact_category].push(fact);
        return acc;
      }, {});

      Object.entries(grouped).forEach(([category, facts]) => {
        factsContext += `\n**${category.toUpperCase()}:**\n`;
        (facts as any[]).forEach(f => {
          factsContext += `- ${f.fact_key}: ${f.fact_value} ${f.fact_unit || ''} (confidence: ${f.confidence}, source: ${f.source})\n`;
        });
      });
    } else {
      factsContext += "Nu există fapte validate anterior în această conversație.\n";
    }

    // 3. Call Lovable AI (Validator Agent - Gemini 2.5 Flash)
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: VALIDATOR_PROMPT + factsContext },
          { role: "user", content: userMessage }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("[VALIDATOR] AI API error:", aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.statusText}`);
    }

    const aiData = await aiResponse.json();
    const validationResult = JSON.parse(aiData.choices[0].message.content);

    console.log("[VALIDATOR] Validation result:", validationResult.validation_status);

    // 4. Save new facts to DB (if any)
    if (validationResult.extracted_facts && validationResult.extracted_facts.length > 0) {
      for (const fact of validationResult.extracted_facts) {
        // Upsert: update if exists (same conversation + key), insert if new
        const { error: upsertError } = await supabaseClient
          .from("strategic_advisor_facts")
          .upsert({
            conversation_id: conversationId,
            user_id: user.id,
            fact_category: fact.fact_category,
            fact_key: fact.fact_key,
            fact_value: fact.fact_value,
            fact_unit: fact.fact_unit || null,
            confidence: fact.confidence || 1.0,
            source: fact.source || 'ai_extraction',
            status: 'validated',
            metadata: { context: fact.context || '', extracted_at: new Date().toISOString() },
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'conversation_id,fact_key',
            ignoreDuplicates: false
          });

        if (upsertError) {
          console.error("[VALIDATOR] Error saving fact:", upsertError);
        }
      }
      console.log(`[VALIDATOR] Saved ${validationResult.extracted_facts.length} facts to DB`);
    }

    // 5. Save validation log
    const { error: logError } = await supabaseClient
      .from("strategic_advisor_validations")
      .insert({
        conversation_id: conversationId,
        user_id: user.id,
        user_message: userMessage,
        validator_response: validationResult,
        validator_model: "google/gemini-2.5-flash",
        validator_tokens_used: aiData.usage?.total_tokens || 0,
        validation_status: validationResult.validation_status,
        missing_fields: validationResult.missing_critical_fields || [],
        conflicts: validationResult.conflicts || [],
        total_cost_cents: Math.ceil((aiData.usage?.total_tokens || 0) / 2000 * 25) // ~0.25 RON
      });

    if (logError) {
      console.error("[VALIDATOR] Error saving validation log:", logError);
    }

    // 6. Return validation result
    return new Response(
      JSON.stringify(validationResult),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );

  } catch (error) {
    console.error("[VALIDATOR] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500
      }
    );
  }
});

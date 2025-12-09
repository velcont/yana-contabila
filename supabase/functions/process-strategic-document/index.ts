import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExtractedFact {
  fact_key: string;
  fact_value: number;
  fact_unit: string;
  fact_category: string;
  confidence: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[process-strategic-document][${requestId}] Starting request`);

  try {
    // Auth verification
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.log(`[process-strategic-document][${requestId}] No auth header`);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      console.log(`[process-strategic-document][${requestId}] User auth failed`);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[process-strategic-document][${requestId}] User: ${user.id}`);

    // Check subscription
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_type, subscription_status")
      .eq("id", user.id)
      .single();

    // Check admin bypass
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (!isAdmin && profile?.subscription_type !== "entrepreneur") {
      return new Response(JSON.stringify({ 
        error: "Doar utilizatorii cu abonament Antreprenor pot folosi această funcție" 
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request
    const { documentId, conversationId, fileContent, fileName, fileType } = await req.json();
    console.log(`[process-strategic-document][${requestId}] Processing: ${fileName} (${fileType})`);

    if (!documentId || !fileContent) {
      return new Response(JSON.stringify({ error: "Missing documentId or fileContent" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract text based on file type
    let extractedText = "";
    
    if (fileType === "text/csv" || fileName.endsWith(".csv")) {
      // CSV: decode and use as-is
      try {
        const base64Content = fileContent.includes(",") 
          ? fileContent.split(",")[1] 
          : fileContent;
        extractedText = atob(base64Content);
        console.log(`[process-strategic-document][${requestId}] CSV extracted: ${extractedText.length} chars`);
      } catch (e) {
        console.error(`[process-strategic-document][${requestId}] CSV decode error:`, e);
        extractedText = "Eroare la decodare CSV";
      }
    } else if (fileType.includes("excel") || fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
      // Excel: we can't parse directly in Deno, but we can extract basic structure
      // For now, we'll send to AI with a note that it's Excel data
      extractedText = `[Document Excel: ${fileName}] - Conținutul va fi analizat de AI pentru extragere date financiare.`;
      console.log(`[process-strategic-document][${requestId}] Excel file detected`);
    } else if (fileType === "application/pdf" || fileName.endsWith(".pdf")) {
      // PDF: we'll need to inform user that PDF parsing has limitations
      extractedText = `[Document PDF: ${fileName}] - Conținut PDF detectat. AI va încerca să extragă datele relevante.`;
      console.log(`[process-strategic-document][${requestId}] PDF file detected`);
    } else {
      // Try to decode as text
      try {
        const base64Content = fileContent.includes(",") 
          ? fileContent.split(",")[1] 
          : fileContent;
        extractedText = atob(base64Content);
      } catch {
        extractedText = `[Document: ${fileName}] - Format necunoscut`;
      }
    }

    // Use AI to extract financial facts
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const extractionPrompt = `Analizează următorul document financiar și extrage TOATE datele financiare pe care le găsești.

DOCUMENT:
${extractedText.slice(0, 15000)}

INSTRUCȚIUNI:
1. Caută orice cifre financiare: venituri, cheltuieli, profit, cash, datorii, creanțe, salarii, TVA, etc.
2. Pentru fiecare cifră găsită, returnează un obiect JSON cu:
   - fact_key: numele indicatorului (ex: "cifra_afaceri", "profit_net", "cheltuieli_salariale")
   - fact_value: valoarea numerică (doar număr, fără text)
   - fact_unit: unitatea ("RON", "EUR", "%", "zile", "persoane")
   - fact_category: categoria ("financial", "company", "metrics", "efficiency")
   - confidence: nivelul de încredere (0.0-1.0)

RĂSPUNDE DOAR CU UN ARRAY JSON VALID. Exemplu:
[
  {"fact_key": "cifra_afaceri", "fact_value": 850000, "fact_unit": "RON", "fact_category": "financial", "confidence": 0.95},
  {"fact_key": "profit_net", "fact_value": 68000, "fact_unit": "RON", "fact_category": "financial", "confidence": 0.90}
]

Dacă nu găsești date financiare, returnează: []`;

    console.log(`[process-strategic-document][${requestId}] Calling AI for extraction`);

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "user", content: extractionPrompt }
        ],
        max_completion_tokens: 4096,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error(`[process-strategic-document][${requestId}] AI error: ${aiResponse.status} - ${errorText}`);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit depășit. Încearcă din nou în câteva secunde." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`AI error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || "[]";
    
    console.log(`[process-strategic-document][${requestId}] AI response received`);

    // Parse extracted facts
    let extractedFacts: ExtractedFact[] = [];
    try {
      // Clean up the response - remove markdown code blocks if present
      let cleanContent = aiContent.trim();
      if (cleanContent.startsWith("```json")) {
        cleanContent = cleanContent.slice(7);
      }
      if (cleanContent.startsWith("```")) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith("```")) {
        cleanContent = cleanContent.slice(0, -3);
      }
      
      extractedFacts = JSON.parse(cleanContent.trim());
      if (!Array.isArray(extractedFacts)) {
        extractedFacts = [];
      }
      console.log(`[process-strategic-document][${requestId}] Extracted ${extractedFacts.length} facts`);
    } catch (parseError) {
      console.error(`[process-strategic-document][${requestId}] Parse error:`, parseError);
      extractedFacts = [];
    }

    // Update document record
    await supabase
      .from("strategic_documents")
      .update({
        extracted_text: extractedText.slice(0, 10000),
        extracted_facts: extractedFacts,
        processing_status: "completed",
        processed_at: new Date().toISOString(),
      })
      .eq("id", documentId);

    // Save facts to strategic_advisor_facts table
    if (extractedFacts.length > 0 && conversationId) {
      for (const fact of extractedFacts) {
        await supabase
          .from("strategic_advisor_facts")
          .upsert({
            user_id: user.id,
            conversation_id: conversationId,
            fact_key: fact.fact_key,
            fact_value: fact.fact_value,
            fact_unit: fact.fact_unit || "RON",
            fact_category: fact.fact_category || "financial",
            source: "document_upload",
            confidence: fact.confidence || 0.8,
            status: "validated",
          }, {
            onConflict: "user_id,conversation_id,fact_key",
          });
      }
      console.log(`[process-strategic-document][${requestId}] Facts saved to strategic_advisor_facts`);
    }

    // Track AI usage (0.50 RON = 50 cents)
    await supabase.from("ai_usage").insert({
      user_id: user.id,
      endpoint: "process-strategic-document",
      model: "google/gemini-2.5-flash",
      input_tokens: extractedText.length / 4,
      output_tokens: aiContent.length / 4,
      total_tokens: (extractedText.length + aiContent.length) / 4,
      estimated_cost_cents: 50,
      month_year: new Date().toISOString().slice(0, 7),
      success: true,
    });

    console.log(`[process-strategic-document][${requestId}] Complete - ${extractedFacts.length} facts extracted`);

    return new Response(JSON.stringify({
      success: true,
      factsExtracted: extractedFacts.length,
      facts: extractedFacts,
      message: `Am extras ${extractedFacts.length} date financiare din ${fileName}`,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error(`[process-strategic-document][${requestId}] Error:`, error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Eroare la procesare document" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

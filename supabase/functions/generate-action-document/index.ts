import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { actionId, documentType, additionalContext } = await req.json();

    if (!actionId) {
      return new Response(JSON.stringify({ error: "actionId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch action item
    const { data: action, error: fetchError } = await supabase
      .from("yana_action_items")
      .select("*")
      .eq("id", actionId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !action) {
      return new Response(JSON.stringify({ error: "Action not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch company context
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .single();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const docType = documentType || action.category;
    const systemPrompt = getDocumentPrompt(docType);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Acțiunea: ${action.action_text}
Context original: ${JSON.stringify(action.source_context)}
Nume utilizator: ${profile?.full_name || "N/A"}
Email: ${profile?.email || "N/A"}
${additionalContext ? `Context adițional: ${additionalContext}` : ""}`
          }
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI error:", response.status, errText);
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await response.json();
    const generatedContent = aiResult.choices?.[0]?.message?.content || "";

    // Save generated content to action item
    await supabase
      .from("yana_action_items")
      .update({
        generated_content: generatedContent,
        status: "in_progress",
      })
      .eq("id", actionId);

    return new Response(JSON.stringify({
      success: true,
      content: generatedContent,
      documentType: docType,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-action-document error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function getDocumentPrompt(category: string): string {
  switch (category) {
    case "email":
      return `Ești YANA, asistent AI de business. Generează un email profesional în limba română.
Structură: Subiect, Corp (salut, conținut, încheiere), Semnătură.
Tonul: profesional dar prietenos. Fii direct și concis.`;
    case "negotiation":
      return `Ești YANA, expert în negocieri de business. Generează un email/script de negociere în română.
Include: argumente concrete, date de referință, propunere clară, plan B.
Tonul: ferm dar diplomatic.`;
    case "document":
      return `Ești YANA, asistent AI de business. Generează un document structurat în română.
Folosește headere clare, bullet points, și secțiuni logice.
Fii practic și acționabil.`;
    default:
      return `Ești YANA, asistent AI de business. Generează conținut profesional în română pentru a ajuta antreprenorul cu acțiunea cerută. Fii direct, practic și acționabil.`;
  }
}

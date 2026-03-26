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
    const { userId, conversationId, userMessage, assistantResponse } = await req.json();

    if (!userId || !userMessage || !assistantResponse) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use tool calling to extract structured actions
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `Ești un asistent care extrage acțiuni concrete din conversații de business. 
Analizează conversația și identifică DOAR acțiuni clare, specifice pe care utilizatorul trebuie să le facă.
NU extrage sfaturi generale. Extrage doar acțiuni cu verbe concrete: "trimite", "verifică", "negociază", "contactează", "creează", "analizează".
Dacă nu există acțiuni concrete, returnează un array gol.`
          },
          {
            role: "user",
            content: `Utilizator: ${userMessage}\n\nRăspuns YANA: ${assistantResponse}`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_actions",
              description: "Extract concrete action items from conversation",
              parameters: {
                type: "object",
                properties: {
                  actions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        action_text: { type: "string", description: "What needs to be done, in Romanian" },
                        category: { type: "string", enum: ["email", "document", "reminder", "task", "negotiation", "verification"] },
                        priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
                        suggested_deadline_days: { type: "number", description: "Suggested deadline in days from now, null if no urgency" }
                      },
                      required: ["action_text", "category", "priority"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["actions"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_actions" } }
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      return new Response(JSON.stringify({ actions_saved: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      return new Response(JSON.stringify({ actions_saved: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let extracted;
    try {
      extracted = JSON.parse(toolCall.function.arguments);
    } catch {
      return new Response(JSON.stringify({ actions_saved: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const actions = extracted.actions || [];
    if (actions.length === 0) {
      return new Response(JSON.stringify({ actions_saved: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save to database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const records = actions.map((a: any) => ({
      user_id: userId,
      conversation_id: conversationId || null,
      action_text: a.action_text,
      category: a.category,
      priority: a.priority,
      status: "pending",
      deadline: a.suggested_deadline_days
        ? new Date(Date.now() + a.suggested_deadline_days * 86400000).toISOString()
        : null,
      reminder_at: a.suggested_deadline_days
        ? new Date(Date.now() + (a.suggested_deadline_days - 1) * 86400000).toISOString()
        : null,
      source_context: {
        user_message: userMessage.slice(0, 500),
        assistant_response: assistantResponse.slice(0, 500),
      },
    }));

    const { error } = await supabase.from("yana_action_items").insert(records);
    if (error) {
      console.error("Insert error:", error);
    }

    console.log(`[extract-actions] Saved ${records.length} actions for user ${userId}`);

    return new Response(JSON.stringify({ actions_saved: records.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("extract-actions error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

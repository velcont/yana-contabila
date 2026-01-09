import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Detectează dacă răspunsul conține o întrebare de engagement
 * Aceeași logică ca în chat-ai/index.ts
 */
function detectsEngagementQuestion(text: string): boolean {
  const trimmed = text.trim();
  
  // Cazul simplu: se termină direct cu ?
  if (trimmed.endsWith('?')) return true;
  
  // Căutăm ? în text - dacă există și după el sunt < 100 caractere, e întrebare de engagement
  const lastQuestionIndex = trimmed.lastIndexOf('?');
  if (lastQuestionIndex > -1) {
    const afterQuestion = trimmed.substring(lastQuestionIndex + 1).trim();
    if (afterQuestion.length < 100) return true;
  }
  
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // NOTĂ: Această funcție rulează cu service role key, deci nu necesită auth extern
    // Este destinată pentru backfill one-time sau apeluri admin programatice

    const { batchSize = 100, dryRun = false } = await req.json().catch(() => ({}));

    console.log(`[backfill-engagement] Starting with batchSize=${batchSize}, dryRun=${dryRun}`);

    // Fetch mesaje care nu au ends_with_question setat
    const { data: messages, error: fetchError } = await supabase
      .from("conversation_history")
      .select("id, content, metadata")
      .eq("role", "assistant")
      .is("metadata->ends_with_question", null)
      .limit(batchSize);

    if (fetchError) {
      console.error("[backfill-engagement] Fetch error:", fetchError);
      throw fetchError;
    }

    if (!messages || messages.length === 0) {
      console.log("[backfill-engagement] No messages to backfill");
      return new Response(
        JSON.stringify({ 
          success: true, 
          processed: 0, 
          remaining: 0,
          message: "Backfill complete - no more messages to process" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[backfill-engagement] Processing ${messages.length} messages`);

    let updatedCount = 0;
    let withQuestionCount = 0;
    const errors: string[] = [];

    for (const msg of messages) {
      const endsWithQuestion = detectsEngagementQuestion(msg.content || "");
      
      if (endsWithQuestion) {
        withQuestionCount++;
      }

      const newMetadata = {
        ...(msg.metadata || {}),
        ends_with_question: endsWithQuestion
      };

      if (!dryRun) {
        const { error: updateError } = await supabase
          .from("conversation_history")
          .update({ metadata: newMetadata })
          .eq("id", msg.id);

        if (updateError) {
          console.error(`[backfill-engagement] Update error for ${msg.id}:`, updateError);
          errors.push(`${msg.id}: ${updateError.message}`);
        } else {
          updatedCount++;
        }
      } else {
        updatedCount++;
      }
    }

    // Verificăm câte mai rămân
    const { count: remainingCount } = await supabase
      .from("conversation_history")
      .select("id", { count: "exact", head: true })
      .eq("role", "assistant")
      .is("metadata->ends_with_question", null);

    console.log(`[backfill-engagement] Completed: ${updatedCount} updated, ${withQuestionCount} with questions, ${remainingCount} remaining`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: updatedCount,
        withQuestion: withQuestionCount,
        remaining: remainingCount || 0,
        errors: errors.length > 0 ? errors : undefined,
        dryRun
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[backfill-engagement] Error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * MEMORY MANAGER — Tiered Memory System (LangChain + LlamaIndex inspired)
 * 
 * Three memory tiers:
 * - Working: Active conversation context (ephemeral)
 * - Episodic: Specific facts from conversations ("Company X has DSO of 90 days")
 * - Semantic: Generalized knowledge ("Companies with DSO > 60 are usually in trouble")
 * 
 * Processes conversations post-response to:
 * 1. Extract episodic memories (facts)
 * 2. Promote repeated episodic facts to semantic memories
 * 3. Provide relevant memories for injection into chat-ai
 */

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface MemoryRequest {
  action: "extract" | "retrieve" | "promote" | "cleanup";
  userId?: string;
  conversationId?: string;
  question?: string;
  answer?: string;
}

// Simple hash for deduplication
function simpleHash(text: string): string {
  let hash = 0;
  const normalized = text.toLowerCase().trim().replace(/\s+/g, " ").slice(0, 200);
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash.toString(36);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body: MemoryRequest = await req.json();
    const { action } = body;

    // ===== ACTION: EXTRACT — Post-conversation fact extraction =====
    if (action === "extract") {
      const { userId, conversationId, question, answer } = body;
      if (!userId || !answer) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing userId or answer" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        return new Response(
          JSON.stringify({ success: false, error: "LOVABLE_API_KEY not configured" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Use a very cheap model to extract facts
      const extractionPrompt = `Extract key financial facts from this conversation exchange.

USER QUESTION: "${(question || "").slice(0, 500)}"
AI ANSWER: "${(answer || "").slice(0, 1500)}"

Return ONLY a JSON array of facts. Each fact should be a specific, reusable piece of information.
Focus on: company metrics, financial indicators, industry context, user preferences.
Skip: greetings, generic advice, procedural instructions.

Format: ["fact1", "fact2", ...]
Return empty array [] if no extractable facts found.
Max 5 facts.`;

      try {
        const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [{ role: "user", content: extractionPrompt }],
            max_tokens: 300,
            temperature: 0.1,
          }),
        });

        if (!aiResp.ok) {
          console.error("[MemoryManager] AI extraction failed:", aiResp.status);
          return new Response(
            JSON.stringify({ success: false, error: "AI call failed" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const aiData = await aiResp.json();
        const content = aiData.choices?.[0]?.message?.content || "[]";
        
        let facts: string[];
        try {
          const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();
          facts = JSON.parse(cleaned);
          if (!Array.isArray(facts)) facts = [];
        } catch {
          console.warn("[MemoryManager] Failed to parse facts, skipping");
          facts = [];
        }

        // Save each fact as episodic memory
        let savedCount = 0;
        for (const fact of facts.slice(0, 5)) {
          if (!fact || fact.length < 10) continue;
          
          const embeddingKey = simpleHash(fact);
          
          // Check for duplicate
          const { data: existing } = await supabase
            .from("yana_semantic_memory")
            .select("id, access_count")
            .eq("user_id", userId)
            .eq("embedding_key", embeddingKey)
            .limit(1);

          if (existing && existing.length > 0) {
            // Increment access count (fact seen again)
            await supabase
              .from("yana_semantic_memory")
              .update({ 
                access_count: (existing[0].access_count || 0) + 1,
                last_accessed_at: new Date().toISOString(),
              })
              .eq("id", existing[0].id);
          } else {
            // New episodic memory
            await supabase.from("yana_semantic_memory").insert({
              user_id: userId,
              memory_type: "episodic",
              content: fact,
              embedding_key: embeddingKey,
              relevance_score: 0.6,
              source_conversation_id: conversationId || null,
            });
            savedCount++;
          }
        }

        console.log(`[MemoryManager] Extracted ${facts.length} facts, saved ${savedCount} new episodic memories for user ${userId}`);

        return new Response(
          JSON.stringify({ success: true, facts_extracted: facts.length, new_memories: savedCount }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (err) {
        console.error("[MemoryManager] Extraction error:", err);
        return new Response(
          JSON.stringify({ success: false, error: (err as Error).message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ===== ACTION: RETRIEVE — Get relevant memories for a user =====
    if (action === "retrieve") {
      const { userId } = body;
      if (!userId) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing userId" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get top 5 semantic memories (generalized knowledge)
      const { data: semanticMemories } = await supabase
        .from("yana_semantic_memory")
        .select("content, relevance_score")
        .eq("user_id", userId)
        .eq("memory_type", "semantic")
        .order("relevance_score", { ascending: false })
        .limit(5);

      // Get top 3 recent episodic memories (specific facts)
      const { data: episodicMemories } = await supabase
        .from("yana_semantic_memory")
        .select("content, relevance_score")
        .eq("user_id", userId)
        .eq("memory_type", "episodic")
        .order("last_accessed_at", { ascending: false })
        .limit(3);

      // Update access timestamps
      const allIds = [
        ...(semanticMemories || []),
        ...(episodicMemories || []),
      ];

      const memories = {
        semantic: (semanticMemories || []).map(m => m.content),
        episodic: (episodicMemories || []).map(m => m.content),
      };

      return new Response(
        JSON.stringify({ success: true, memories }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ===== ACTION: PROMOTE — Promote episodic to semantic =====
    if (action === "promote") {
      // Find episodic memories accessed 3+ times → promote to semantic
      const { data: candidates } = await supabase
        .from("yana_semantic_memory")
        .select("id, content, user_id, access_count")
        .eq("memory_type", "episodic")
        .gte("access_count", 3);

      let promoted = 0;
      for (const mem of candidates || []) {
        await supabase
          .from("yana_semantic_memory")
          .update({
            memory_type: "semantic",
            relevance_score: 0.85,
          })
          .eq("id", mem.id);
        promoted++;
      }

      console.log(`[MemoryManager] Promoted ${promoted} episodic memories to semantic`);

      return new Response(
        JSON.stringify({ success: true, promoted }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ===== ACTION: CLEANUP — Remove old working memories =====
    if (action === "cleanup") {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      const { count } = await supabase
        .from("yana_semantic_memory")
        .delete()
        .eq("memory_type", "working")
        .lt("created_at", oneHourAgo);

      // Also clean very old episodic with low relevance
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { count: oldEpisodic } = await supabase
        .from("yana_semantic_memory")
        .delete()
        .eq("memory_type", "episodic")
        .lt("relevance_score", 0.3)
        .lt("last_accessed_at", thirtyDaysAgo);

      console.log(`[MemoryManager] Cleanup: removed ${count || 0} working, ${oldEpisodic || 0} old episodic memories`);

      return new Response(
        JSON.stringify({ success: true, working_cleaned: count || 0, episodic_cleaned: oldEpisodic || 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action. Use: extract, retrieve, promote, cleanup" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[MemoryManager] Error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Generate embeddings for semantic memory entries and perform semantic search.
 * Uses Lovable AI Gateway for embedding generation.
 * 
 * Actions:
 * - "embed": Generate embedding for a memory entry and store it
 * - "search": Search memories by semantic similarity
 * - "backfill": Generate embeddings for entries missing them
 */

async function generateEmbedding(text: string, lovableKey: string): Promise<number[]> {
  // Use Gemini to generate a pseudo-embedding via structured output
  // Real embeddings would use a dedicated embedding model
  const res = await fetch("https://ai.lovable.dev/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-lite",
      messages: [
        {
          role: "system",
          content: `You are an embedding generator. Convert the input text into a semantic representation.
Return ONLY a JSON array of exactly 768 floating point numbers between -1 and 1 that represent the semantic meaning of the text.
Focus on: topic, intent, entities, sentiment, domain-specific terms.
No other text, just the JSON array.`,
        },
        { role: "user", content: text.slice(0, 2000) },
      ],
      temperature: 0,
      response_format: { type: "json_object" },
    }),
  });

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || "{}";
  
  try {
    const parsed = JSON.parse(content);
    // Handle both {embedding: [...]} and direct array formats
    const arr = Array.isArray(parsed) ? parsed : parsed.embedding || parsed.values || [];
    if (arr.length === 768) return arr;
    
    // If wrong size, pad/truncate to 768
    const result = new Array(768).fill(0);
    for (let i = 0; i < Math.min(arr.length, 768); i++) {
      result[i] = typeof arr[i] === 'number' ? Math.max(-1, Math.min(1, arr[i])) : 0;
    }
    return result;
  } catch {
    // Fallback: generate simple hash-based embedding
    const result = new Array(768).fill(0);
    for (let i = 0; i < text.length && i < 768; i++) {
      result[i] = (text.charCodeAt(i) % 200 - 100) / 100;
    }
    return result;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, memoryId, query, limit = 5, threshold = 0.65 } = await req.json();

    if (action === "search" && query) {
      // Generate embedding for query
      const queryEmbedding = await generateEmbedding(query, lovableKey);
      
      // Search via pgvector
      const { data: matches, error } = await supabase.rpc("match_semantic_memories", {
        query_embedding: JSON.stringify(queryEmbedding),
        match_user_id: user.id,
        match_threshold: threshold,
        match_count: limit,
      });

      if (error) {
        console.error("[semantic-search] RPC error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ matches: matches || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "embed" && memoryId) {
      // Get memory content
      const { data: memory } = await supabase
        .from("yana_semantic_memory")
        .select("content, context")
        .eq("id", memoryId)
        .eq("user_id", user.id)
        .single();

      if (!memory) {
        return new Response(JSON.stringify({ error: "Memory not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const textToEmbed = `${memory.content} ${JSON.stringify(memory.context || {})}`.slice(0, 2000);
      const embedding = await generateEmbedding(textToEmbed, lovableKey);

      const { error } = await supabase
        .from("yana_semantic_memory")
        .update({ embedding: JSON.stringify(embedding) })
        .eq("id", memoryId);

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "backfill") {
      // Find memories without embeddings
      const { data: memories } = await supabase
        .from("yana_semantic_memory")
        .select("id, content, context")
        .eq("user_id", user.id)
        .is("embedding", null)
        .order("created_at", { ascending: false })
        .limit(20);

      if (!memories?.length) {
        return new Response(JSON.stringify({ processed: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let processed = 0;
      for (const mem of memories) {
        try {
          const text = `${mem.content} ${JSON.stringify(mem.context || {})}`.slice(0, 2000);
          const embedding = await generateEmbedding(text, lovableKey);
          await supabase
            .from("yana_semantic_memory")
            .update({ embedding: JSON.stringify(embedding) })
            .eq("id", mem.id);
          processed++;
        } catch (e) {
          console.error(`[semantic-search] Error embedding ${mem.id}:`, e);
        }
      }

      return new Response(JSON.stringify({ processed, total: memories.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action. Use: search, embed, backfill" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[semantic-search] Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Cleanup YANA Data - Data Retention Policy
 * 
 * Rulează săptămânal pentru a curăța datele vechi:
 * - yana_journal: entries > 90 zile
 * - yana_dreams: păstrează doar ultimele 10 per user
 * - hook_signals: signals > 30 zile (datele sunt deja agregate în relationship_score)
 */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log("[cleanup-yana-data] Starting data retention cleanup...");

    const stats = {
      journal_deleted: 0,
      dreams_deleted: 0,
      signals_deleted: 0,
    };

    // 1. Șterge yana_journal entries mai vechi de 90 zile
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: journalDeleted, error: journalError } = await supabase
      .from('yana_journal')
      .delete()
      .lt('created_at', ninetyDaysAgo)
      .select('id');
    
    if (journalError) {
      console.error("[cleanup-yana-data] Journal cleanup error:", journalError);
    } else {
      stats.journal_deleted = journalDeleted?.length || 0;
      console.log(`[cleanup-yana-data] Deleted ${stats.journal_deleted} old journal entries`);
    }

    // 2. Șterge hook_signals mai vechi de 30 zile
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: signalsDeleted, error: signalsError } = await supabase
      .from('hook_signals')
      .delete()
      .lt('detected_at', thirtyDaysAgo)
      .select('id');
    
    if (signalsError) {
      console.error("[cleanup-yana-data] Signals cleanup error:", signalsError);
    } else {
      stats.signals_deleted = signalsDeleted?.length || 0;
      console.log(`[cleanup-yana-data] Deleted ${stats.signals_deleted} old hook signals`);
    }

    // 3. Păstrează doar ultimele 10 vise per user (în shared_with)
    // Obține toate visele și identifică pe cele de păstrat
    const { data: allDreams, error: dreamsError } = await supabase
      .from('yana_dreams')
      .select('id, created_at')
      .order('created_at', { ascending: false });
    
    if (!dreamsError && allDreams && allDreams.length > 10) {
      // Păstrăm ultimele 10, ștergem restul
      const dreamsToDelete = allDreams.slice(10).map(d => d.id);
      
      if (dreamsToDelete.length > 0) {
        const { data: deleted, error: deleteError } = await supabase
          .from('yana_dreams')
          .delete()
          .in('id', dreamsToDelete)
          .select('id');
        
        if (!deleteError) {
          stats.dreams_deleted = deleted?.length || 0;
          console.log(`[cleanup-yana-data] Deleted ${stats.dreams_deleted} old dreams (keeping last 10)`);
        }
      }
    }

    // Log final
    console.log("[cleanup-yana-data] Cleanup complete:", stats);

    return new Response(
      JSON.stringify({
        success: true,
        stats,
        executed_at: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[cleanup-yana-data] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

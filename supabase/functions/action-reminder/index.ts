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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date().toISOString();

    // 1. Find actions with reminders due
    const { data: dueReminders, error: remErr } = await supabase
      .from("yana_action_items")
      .select("*, profiles:user_id(email, full_name)")
      .lte("reminder_at", now)
      .eq("status", "pending")
      .limit(50);

    if (remErr) {
      console.error("Error fetching reminders:", remErr);
    }

    let remindersSent = 0;

    if (dueReminders && dueReminders.length > 0) {
      // Group by user
      const byUser = new Map<string, any[]>();
      for (const item of dueReminders) {
        const list = byUser.get(item.user_id) || [];
        list.push(item);
        byUser.set(item.user_id, list);
      }

      for (const [userId, items] of byUser) {
        const profile = (items[0] as any).profiles;
        if (!profile?.email) continue;

        // Send reminder notification (log for now, email integration can be added)
        console.log(`[action-reminder] User ${profile.email} has ${items.length} pending actions`);

        // Clear reminder_at so we don't re-send
        const ids = items.map((i: any) => i.id);
        await supabase
          .from("yana_action_items")
          .update({ reminder_at: null })
          .in("id", ids);

        remindersSent += items.length;
      }
    }

    // 2. Mark overdue actions
    const { data: overdue, error: overdueErr } = await supabase
      .from("yana_action_items")
      .update({ status: "overdue" })
      .lt("deadline", now)
      .eq("status", "pending")
      .select("id");

    const overdueCount = overdue?.length || 0;
    if (overdueErr) {
      console.error("Error marking overdue:", overdueErr);
    }

    console.log(`[action-reminder] Reminders sent: ${remindersSent}, Marked overdue: ${overdueCount}`);

    return new Response(JSON.stringify({
      success: true,
      reminders_sent: remindersSent,
      marked_overdue: overdueCount,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("action-reminder error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

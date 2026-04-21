/**
 * YANA WEEKLY EVOLUTION REPORT
 * Mondays 09:00 UTC. Sends email to notify_email with the week's self-development summary.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { data: settings } = await supabase
      .from("yana_self_dev_settings")
      .select("enabled, notify_email")
      .limit(1)
      .maybeSingle();
    if (settings && !settings.enabled) {
      return new Response(JSON.stringify({ skipped: "disabled" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const email = settings?.notify_email || "office@velcont.com";
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

    const [{ count: gapsDetected }, { count: gapsResolved }, { count: discoveries }, { count: proposalsCreated }, { count: proposalsDeployed }, { count: proposalsRolledBack }, { data: topGaps }, { data: deployedAgents }] = await Promise.all([
      supabase.from("yana_capability_gaps").select("*", { count: "exact", head: true }).gte("detected_at", weekAgo),
      supabase.from("yana_capability_gaps").select("*", { count: "exact", head: true }).eq("status", "resolved").gte("updated_at", weekAgo),
      supabase.from("yana_discovery_feed").select("*", { count: "exact", head: true }).gte("discovered_at", weekAgo),
      supabase.from("yana_self_proposals").select("*", { count: "exact", head: true }).gte("created_at", weekAgo),
      supabase.from("yana_self_proposals").select("*", { count: "exact", head: true }).eq("status", "deployed").gte("deployed_at", weekAgo),
      supabase.from("yana_self_proposals").select("*", { count: "exact", head: true }).eq("status", "rolled_back").gte("rolled_back_at", weekAgo),
      supabase.from("yana_capability_gaps").select("topic, description, impact_score, status").order("impact_score", { ascending: false }).limit(5),
      supabase.from("yana_self_proposals").select("title, deployed_at, current_success_rate").eq("status", "deployed").gte("deployed_at", weekAgo).limit(10),
    ]);

    const html = `<!DOCTYPE html><html><body style="font-family: Inter, sans-serif; max-width: 640px; margin: 0 auto; color: #1a1a1a;">
<div style="background: linear-gradient(135deg, #667eea, #764ba2); padding: 32px; border-radius: 12px 12px 0 0; color: white;">
  <h1 style="margin: 0; font-size: 28px;">🧠 YANA Evolution Report</h1>
  <p style="margin: 8px 0 0; opacity: 0.9;">Săptămâna ${new Date(weekAgo).toLocaleDateString("ro-RO")} — ${new Date().toLocaleDateString("ro-RO")}</p>
</div>
<div style="padding: 32px; background: #fff; border: 1px solid #eee; border-top: none; border-radius: 0 0 12px 12px;">
  <h2 style="font-size: 20px;">📊 Cifre săptămâna asta</h2>
  <table style="width: 100%; border-collapse: collapse;">
    <tr><td style="padding: 8px;">Lacune detectate:</td><td style="padding: 8px; text-align: right;"><b>${gapsDetected || 0}</b></td></tr>
    <tr style="background: #f9f9f9;"><td style="padding: 8px;">Lacune rezolvate:</td><td style="padding: 8px; text-align: right;"><b style="color: #16a34a;">${gapsResolved || 0}</b></td></tr>
    <tr><td style="padding: 8px;">Descoperiri externe (GitHub/arxiv/HF/PH):</td><td style="padding: 8px; text-align: right;"><b>${discoveries || 0}</b></td></tr>
    <tr style="background: #f9f9f9;"><td style="padding: 8px;">Propuneri de cod auto-generate:</td><td style="padding: 8px; text-align: right;"><b>${proposalsCreated || 0}</b></td></tr>
    <tr><td style="padding: 8px;">Agenți noi deployați:</td><td style="padding: 8px; text-align: right;"><b style="color: #16a34a;">${proposalsDeployed || 0}</b></td></tr>
    <tr style="background: #f9f9f9;"><td style="padding: 8px;">Rollback-uri (safety net activat):</td><td style="padding: 8px; text-align: right;"><b style="color: #dc2626;">${proposalsRolledBack || 0}</b></td></tr>
  </table>

  <h2 style="font-size: 20px; margin-top: 32px;">🎯 Top 5 lacune de capacitate</h2>
  <ul>${(topGaps || []).map((g: any) => `<li><b>${g.topic}</b> (impact ${(g.impact_score || 0).toFixed(1)}, ${g.status}): ${g.description}</li>`).join("") || "<li>Niciuna 🎉</li>"}</ul>

  <h2 style="font-size: 20px; margin-top: 32px;">✅ Agenți noi deployați</h2>
  <ul>${(deployedAgents || []).map((a: any) => `<li><b>${a.title}</b> — succes ${((a.current_success_rate || 0) * 100).toFixed(0)}%</li>`).join("") || "<li>Niciun agent nou săptămâna asta.</li>"}</ul>

  <p style="margin-top: 32px; color: #666; font-size: 14px;">YANA învață singură. Ai control total din panoul Admin → Auto-Development.</p>
</div></body></html>`;

    let emailSent = false;
    if (RESEND_API_KEY && email) {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "YANA Evolution <yana@velcont.com>",
          to: [email],
          subject: `🧠 YANA Evolution Report — ${proposalsDeployed || 0} agenți noi, ${gapsResolved || 0} lacune rezolvate`,
          html,
        }),
      });
      emailSent = r.ok;
      if (!r.ok) console.warn("[weekly-report] email failed", await r.text());
    }

    return new Response(JSON.stringify({
      success: true,
      email_sent: emailSent,
      stats: { gapsDetected, gapsResolved, discoveries, proposalsCreated, proposalsDeployed, proposalsRolledBack },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("[yana-weekly-report] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

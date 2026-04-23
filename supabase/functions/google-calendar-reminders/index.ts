import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { getServiceClient } from "../_shared/google-calendar.ts";

// Caută evenimente care încep în următoarele 30 minute și NU au fost notificate.
// Trimite mesaj proactiv în chat (insert în yana_proactive_messages sau notifications).

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const svc = getServiceClient();
    const now = new Date();
    const in30min = new Date(now.getTime() + 30 * 60 * 1000);

    const { data: events, error } = await svc
      .from("user_google_calendar_events")
      .select("id, user_id, summary, start_time, location, meet_link, html_link")
      .eq("reminder_sent", false)
      .gte("start_time", now.toISOString())
      .lte("start_time", in30min.toISOString());

    if (error) throw error;

    let sent = 0;
    for (const ev of events || []) {
      const startLocal = new Date(ev.start_time).toLocaleString("ro-RO", {
        hour: "2-digit", minute: "2-digit", timeZone: "Europe/Bucharest",
      });
      const minutesUntil = Math.round((new Date(ev.start_time).getTime() - now.getTime()) / 60000);

      let message = `📅 În ${minutesUntil} minute (${startLocal}): **${ev.summary}**`;
      if (ev.location) message += `\n📍 ${ev.location}`;
      if (ev.meet_link) message += `\n🎥 [Join Meet](${ev.meet_link})`;

      // Insert ca notificare/mesaj proactiv. Folosim notifications dacă există, fallback la yana_initiative_log.
      try {
        await svc.from("notifications").insert({
          user_id: ev.user_id,
          type: "calendar_reminder",
          title: `În curând: ${ev.summary}`,
          message,
          metadata: { event_id: ev.id, html_link: ev.html_link, meet_link: ev.meet_link },
        });
      } catch (_) {
        // tabel poate să nu existe — încercăm yana_initiative_log
        try {
          await svc.from("yana_initiative_log").insert({
            user_id: ev.user_id,
            initiative_type: "calendar_reminder",
            content: message,
            metadata: { event_id: ev.id },
          });
        } catch (_) { /* ignore */ }
      }

      await svc
        .from("user_google_calendar_events")
        .update({ reminder_sent: true })
        .eq("id", ev.id);
      sent++;
    }

    return new Response(JSON.stringify({ ok: true, reminders_sent: sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("reminders error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
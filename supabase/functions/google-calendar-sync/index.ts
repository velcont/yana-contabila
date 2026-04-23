import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { gcalFetch, getServiceClient, getUserClient } from "../_shared/google-calendar.ts";

// Sincronizează evenimentele din Google Calendar în cache local.
// Poate fi apelată de utilizator (Authorization header) sau de cron (cu service-role pentru toți userii activi).

async function syncForUser(userId: string) {
  const svc = getServiceClient();
  const now = new Date();
  const future = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 zile înainte
  const past = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000); // 1 zi în urmă

  const params = new URLSearchParams({
    timeMin: past.toISOString(),
    timeMax: future.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });

  const data = await gcalFetch(userId, `/calendars/primary/events?${params.toString()}`);
  const items = (data.items || []) as any[];

  let upserted = 0;
  for (const ev of items) {
    const isAllDay = !!ev.start?.date;
    const startISO = ev.start?.dateTime || (ev.start?.date ? new Date(ev.start.date + "T00:00:00").toISOString() : null);
    const endISO = ev.end?.dateTime || (ev.end?.date ? new Date(ev.end.date + "T23:59:59").toISOString() : null);
    if (!startISO || !endISO) continue;

    const meetLink = ev.conferenceData?.entryPoints?.find((e: any) => e.entryPointType === "video")?.uri || null;

    await svc.from("user_google_calendar_events").upsert({
      user_id: userId,
      google_event_id: ev.id,
      calendar_id: "primary",
      summary: ev.summary || "(fără titlu)",
      description: ev.description || null,
      location: ev.location || null,
      start_time: startISO,
      end_time: endISO,
      all_day: isAllDay,
      attendees: ev.attendees || [],
      organizer: ev.organizer || null,
      status: ev.status || null,
      html_link: ev.htmlLink || null,
      meet_link: meetLink,
      raw_data: ev,
    }, { onConflict: "user_id,google_event_id" });
    upserted++;
  }

  await svc
    .from("user_google_calendar_tokens")
    .update({ last_sync_at: new Date().toISOString() })
    .eq("user_id", userId);

  return upserted;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const cronMode = url.searchParams.get("cron") === "1";

    if (cronMode) {
      // Sync pentru toți userii activi
      const svc = getServiceClient();
      const { data: tokens } = await svc
        .from("user_google_calendar_tokens")
        .select("user_id")
        .eq("is_active", true);

      let totalUsers = 0;
      let totalEvents = 0;
      for (const t of tokens || []) {
        try {
          const n = await syncForUser(t.user_id);
          totalEvents += n;
          totalUsers++;
        } catch (e) {
          console.error(`Sync failed for ${t.user_id}:`, e instanceof Error ? e.message : e);
        }
      }
      return new Response(JSON.stringify({ ok: true, users: totalUsers, events: totalEvents }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const auth = await getUserClient(req.headers.get("Authorization"));
    if (!auth) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const count = await syncForUser(auth.user.id);
    return new Response(JSON.stringify({ ok: true, synced: count }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("sync error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
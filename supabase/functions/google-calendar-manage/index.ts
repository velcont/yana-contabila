import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { gcalFetch, getUserClient, getServiceClient } from "../_shared/google-calendar.ts";

// Acțiuni: list_events | create_event | update_event | delete_event | disconnect | status

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = await getUserClient(req.headers.get("Authorization"));
    if (!auth) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = auth.user.id;
    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    const svc = getServiceClient();

    if (action === "status") {
      const { data: tok } = await svc
        .from("user_google_calendar_tokens")
        .select("calendar_email, last_sync_at, is_active, created_at")
        .eq("user_id", userId)
        .maybeSingle();
      return new Response(JSON.stringify({ connected: !!tok?.is_active, ...tok }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "disconnect") {
      await svc.from("user_google_calendar_tokens").delete().eq("user_id", userId);
      await svc.from("user_google_calendar_events").delete().eq("user_id", userId);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "list_events") {
      const timeMin = body.time_min || new Date().toISOString();
      const timeMax = body.time_max || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const params = new URLSearchParams({
        timeMin, timeMax, singleEvents: "true", orderBy: "startTime",
        maxResults: String(body.max_results || 50),
      });
      const data = await gcalFetch(userId, `/calendars/primary/events?${params.toString()}`);
      return new Response(JSON.stringify({ events: data.items || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "create_event") {
      const { summary, description, location, start, end, attendees, all_day } = body;
      if (!summary || !start || !end) {
        return new Response(JSON.stringify({ error: "summary, start, end sunt obligatorii" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const event: any = {
        summary, description, location,
        start: all_day ? { date: start } : { dateTime: start, timeZone: "Europe/Bucharest" },
        end: all_day ? { date: end } : { dateTime: end, timeZone: "Europe/Bucharest" },
      };
      if (attendees?.length) event.attendees = attendees.map((e: string) => ({ email: e }));
      const data = await gcalFetch(userId, `/calendars/primary/events`, {
        method: "POST", body: JSON.stringify(event),
      });
      return new Response(JSON.stringify({ ok: true, event: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_event") {
      const { event_id, ...updates } = body;
      if (!event_id) {
        return new Response(JSON.stringify({ error: "event_id obligatoriu" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const patch: any = {};
      if (updates.summary) patch.summary = updates.summary;
      if (updates.description) patch.description = updates.description;
      if (updates.location) patch.location = updates.location;
      if (updates.start) patch.start = updates.all_day ? { date: updates.start } : { dateTime: updates.start, timeZone: "Europe/Bucharest" };
      if (updates.end) patch.end = updates.all_day ? { date: updates.end } : { dateTime: updates.end, timeZone: "Europe/Bucharest" };
      const data = await gcalFetch(userId, `/calendars/primary/events/${event_id}`, {
        method: "PATCH", body: JSON.stringify(patch),
      });
      return new Response(JSON.stringify({ ok: true, event: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete_event") {
      const { event_id } = body;
      if (!event_id) {
        return new Response(JSON.stringify({ error: "event_id obligatoriu" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await gcalFetch(userId, `/calendars/primary/events/${event_id}`, { method: "DELETE" });
      await svc.from("user_google_calendar_events").delete()
        .eq("user_id", userId).eq("google_event_id", event_id);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: `Acțiune necunoscută: ${action}` }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("manage error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
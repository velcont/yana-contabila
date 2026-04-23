// WhatsApp Bot API — endpoint pentru bot-ul local
// Rute (autentificare prin header X-Bot-Token):
//   GET  /config       -> returnează config-ul
//   POST /heartbeat    -> { device_info?, total_today?, last_error? }
//   POST /log-message  -> { contact_id, contact_name?, is_group, incoming_text, reply_text?, reply_type, matched_keyword?, tokens_used?, latency_ms?, error? }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-bot-token",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function authBot(req: Request) {
  const token = req.headers.get("x-bot-token");
  if (!token) return null;
  const { data, error } = await supabase
    .from("wa_bot_config")
    .select("*")
    .eq("bot_token", token)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const path = url.pathname.split("/").pop() || "";

  try {
    const cfg = await authBot(req);
    if (!cfg) return json({ error: "Invalid or missing bot token" }, 401);

    if (path === "config" && req.method === "GET") {
      return json({
        enabled: cfg.enabled,
        respond_in_groups: cfg.respond_in_groups,
        cooldown_seconds: cfg.cooldown_seconds,
        model: cfg.model,
        max_tokens: cfg.max_tokens,
        system_prompt: cfg.system_prompt,
        keyword_rules: cfg.keyword_rules,
      });
    }

    if (path === "heartbeat" && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const today = new Date().toISOString().slice(0, 10);

      // reset total_messages_today daca e zi noua
      const { data: existing } = await supabase
        .from("wa_bot_status")
        .select("updated_at, total_messages_today")
        .eq("user_id", cfg.user_id)
        .maybeSingle();

      const isNewDay = !existing || (existing.updated_at && !existing.updated_at.startsWith(today));

      await supabase.from("wa_bot_status").upsert({
        user_id: cfg.user_id,
        is_online: true,
        last_heartbeat_at: new Date().toISOString(),
        device_info: body.device_info ?? existing?.updated_at ? undefined : null,
        total_messages_today: isNewDay ? 0 : (existing?.total_messages_today ?? 0),
        last_error: body.last_error ?? null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

      return json({ ok: true });
    }

    if (path === "log-message" && req.method === "POST") {
      const body = await req.json();
      if (!body.contact_id || !body.incoming_text) {
        return json({ error: "contact_id and incoming_text required" }, 400);
      }

      const { error: insErr } = await supabase.from("wa_bot_messages").insert({
        user_id: cfg.user_id,
        contact_id: String(body.contact_id).slice(0, 100),
        contact_name: body.contact_name?.toString().slice(0, 200) ?? null,
        is_group: !!body.is_group,
        incoming_text: String(body.incoming_text).slice(0, 4000),
        reply_text: body.reply_text ? String(body.reply_text).slice(0, 4000) : null,
        reply_type: ["ai", "keyword", "skipped", "error"].includes(body.reply_type) ? body.reply_type : "ai",
        matched_keyword: body.matched_keyword?.toString().slice(0, 100) ?? null,
        tokens_used: typeof body.tokens_used === "number" ? body.tokens_used : null,
        latency_ms: typeof body.latency_ms === "number" ? body.latency_ms : null,
        error: body.error ? String(body.error).slice(0, 500) : null,
      });
      if (insErr) return json({ error: insErr.message }, 500);

      // increment counters
      await supabase.rpc("increment_wa_message_counters", { p_user_id: cfg.user_id }).then(() => {}, () => {
        // fallback fără RPC - update direct
        return supabase.from("wa_bot_status").upsert({
          user_id: cfg.user_id,
          is_online: true,
          last_heartbeat_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
      });

      return json({ ok: true });
    }

    return json({ error: "Not found" }, 404);
  } catch (err) {
    console.error("wa-bot-api error:", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});

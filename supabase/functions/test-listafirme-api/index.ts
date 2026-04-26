/**
 * TEST RAPID — verifică dacă cheia LISTAFIRME_API_KEY răspunde 200 OK.
 * Body opțional: { date?: "YYYY/MM/DD" }  (default: ieri)
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function yesterdayYmd(): string {
  const d = new Date(Date.now() - 86400000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}/${m}/${day}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const apiKey = Deno.env.get("LISTAFIRME_API_KEY") || "";
  const body = await req.json().catch(() => ({}));
  const date = (body && typeof body.date === "string") ? body.date : yesterdayYmd();

  const meta = {
    key_present: apiKey.length > 0,
    key_length: apiKey.length,
    key_preview: apiKey ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}` : null,
    test_date: date,
  };

  if (!apiKey) {
    return new Response(JSON.stringify({ ok: false, reason: "LISTAFIRME_API_KEY not set", meta }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const form = new URLSearchParams();
  form.set("key", apiKey);
  form.set("data", date);

  const t0 = Date.now();
  const resp = await fetch("https://listafirme.ro/api/firme-noi-v2.asp", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  const text = await resp.text();
  const elapsedMs = Date.now() - t0;

  const ct = resp.headers.get("content-type") || "";
  const looksHtml = /<html|<!doctype/i.test(text.slice(0, 200));
  const lines = text.split(/\r?\n/).filter(Boolean);

  return new Response(JSON.stringify({
    ok: resp.ok && !looksHtml,
    http_status: resp.status,
    elapsed_ms: elapsedMs,
    content_type: ct,
    response_size_bytes: text.length,
    looks_like_html_error: looksHtml,
    line_count: lines.length,
    preview_first_500: text.slice(0, 500),
    preview_last_300: text.slice(-300),
    meta,
  }, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
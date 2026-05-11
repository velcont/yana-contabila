import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function excelSerialToISO(v: any): string | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") {
    const ms = Date.UTC(1899, 11, 30) + v * 86400000;
    return new Date(ms).toISOString().slice(0, 10);
  }
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { file_path } = await req.json();
    if (!file_path) return new Response(JSON.stringify({ error: "file_path required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: fileBlob, error: dlErr } = await admin.storage.from("firme-noi-uploads").download(file_path);
    if (dlErr || !fileBlob) throw new Error("download failed: " + (dlErr?.message ?? "no file"));

    const buf = new Uint8Array(await fileBlob.arrayBuffer());
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: null });

    // parse period from filename: ..._YYYY-MM-DD-YYYY-MM-DD_...
    const m = file_path.match(/(\d{4}-\d{2}-\d{2})-(\d{4}-\d{2}-\d{2})/);
    const period_start = m?.[1] ?? null;
    const period_end = m?.[2] ?? null;

    const { data: batch, error: bErr } = await admin
      .from("new_companies_batches")
      .insert({
        file_name: file_path,
        period_start,
        period_end,
        uploaded_by: user.id,
        total_rows: rows.length,
      })
      .select()
      .single();
    if (bErr) throw bErr;

    let inserted = 0;
    const chunk = 500;
    for (let i = 0; i < rows.length; i += chunk) {
      const slice = rows.slice(i, i + chunk).map((r: any) => ({
        batch_id: batch.id,
        cui: String(r.CUI ?? r.cui ?? "").trim(),
        nr_inmatriculare: r.NrInmatriculare ?? r.nr_inmatriculare ?? null,
        nume: r.Nume ?? r.nume ?? "",
        judet: r.Judet ?? r.judet ?? null,
        localitate: r.Localitate ?? r.localitate ?? null,
        tip: r.Tip ?? r.tip ?? null,
        adresa: r.Adresa ?? r.adresa ?? null,
        nr: r.Nr != null ? String(r.Nr) : null,
        telefon: r.Telefon ?? r.telefon ?? null,
        mobil: r.Mobil ?? r.mobil ?? null,
        fax: r.Fax ?? r.fax ?? null,
        data_infiintarii: excelSerialToISO(r.DataInfiintarii ?? r.data_infiintarii),
        data_actualizarii: excelSerialToISO(r.DataActualizarii ?? r.data_actualizarii),
        caen: r.CAEN != null ? String(r.CAEN) : null,
        descriere_caen: r.DescriereCAENRo ?? r.descriere_caen ?? null,
      })).filter(r => r.cui && r.nume);

      const { error: iErr, count } = await admin
        .from("new_companies")
        .upsert(slice, { onConflict: "cui", ignoreDuplicates: true, count: "exact" });
      if (iErr) console.error("chunk err", iErr);
      else inserted += count ?? 0;
    }

    await admin.from("new_companies_batches").update({
      inserted_rows: inserted,
      duplicate_rows: rows.length - inserted,
    }).eq("id", batch.id);

    return new Response(JSON.stringify({ batch_id: batch.id, total: rows.length, inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
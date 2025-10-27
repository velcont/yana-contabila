import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, message: "Missing Authorization header" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userRes, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userRes.user) {
      return new Response(
        JSON.stringify({ success: false, message: "Unauthorized" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const requestingUser = userRes.user;
    const body = await req.json();
    const { companyId, vatRegime, cashAccountingVat, taxType } = body ?? {};

    if (!companyId) {
      return new Response(
        JSON.stringify({ success: false, message: "companyId is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Check admin role via RPC (best-effort)
    let isAdmin = false;
    try {
      const { data: isAdminRes } = await supabaseAdmin.rpc("has_role", {
        _user_id: requestingUser.id,
        _role: "admin",
      });
      isAdmin = Boolean(isAdminRes);
    } catch (_) {}

    // Fetch company to verify ownership/management
    const { data: company, error: companyFetchErr } = await supabaseAdmin
      .from("companies")
      .select("id, managed_by_accountant_id")
      .eq("id", companyId)
      .single();

    if (companyFetchErr || !company) {
      return new Response(
        JSON.stringify({ success: false, message: "Company not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const canManage = isAdmin || company.managed_by_accountant_id === requestingUser.id;
    if (!canManage) {
      return new Response(
        JSON.stringify({ success: false, message: "Forbidden" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Perform the update using service role (bypasses RLS issues safely after auth check)
    const { error: updateErr } = await supabaseAdmin
      .from("companies")
      .update({
        vat_regime: vatRegime ?? null,
        cash_accounting_vat: typeof cashAccountingVat === "boolean" ? cashAccountingVat : cashAccountingVat === "true",
        tax_type: taxType ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", companyId);

    if (updateErr) {
      console.error("[update-fiscal-params] Update error:", updateErr);
      return new Response(
        JSON.stringify({ success: false, message: updateErr.message || "Update failed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    console.log("[update-fiscal-params] Updated fiscal params for", companyId);
    return new Response(
      JSON.stringify({ success: true, message: "Fiscal params updated" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("[update-fiscal-params] Unexpected error:", error);
    return new Response(
      JSON.stringify({ success: false, message: error instanceof Error ? error.message : "Internal server error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const email = url.searchParams.get('email');

    if (!email) {
      return new Response(
        generateHtml('Eroare', 'Email lipsă din cerere.', false),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Add to unsubscribes (upsert to avoid duplicates)
    const { error } = await supabase
      .from('outreach_unsubscribes')
      .upsert({ email: email.toLowerCase() }, { onConflict: 'email' });

    if (error) {
      console.error('[unsubscribe-outreach] Error:', error);
      return new Response(
        generateHtml('Eroare', 'A apărut o eroare. Te rugăm să încerci din nou.', false),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    // Also update the lead status if exists
    await supabase
      .from('outreach_leads')
      .update({ status: 'unsubscribed', updated_at: new Date().toISOString() })
      .eq('email', email.toLowerCase());

    console.log(`[unsubscribe-outreach] Unsubscribed: ${email}`);

    return new Response(
      generateHtml('Dezabonat cu succes', 'Nu vei mai primi emailuri de la YANA. Ne pare rău să te vedem plecând!', true),
      { headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' } }
    );

  } catch (error) {
    console.error('[unsubscribe-outreach] Error:', error);
    return new Response(
      generateHtml('Eroare', 'A apărut o eroare neașteptată.', false),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
});

function generateHtml(title: string, message: string, success: boolean): string {
  const color = success ? '#4ade80' : '#f87171';
  return `
<!DOCTYPE html>
<html lang="ro">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${title}</title></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f8f9fa;display:flex;justify-content:center;align-items:center;min-height:100vh;">
  <div style="background:#fff;border-radius:16px;padding:48px;max-width:480px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="font-size:48px;margin-bottom:16px;">${success ? '✅' : '❌'}</div>
    <h1 style="font-size:24px;color:#1a1a2e;margin:0 0 12px;">${title}</h1>
    <p style="font-size:16px;color:#666;line-height:1.6;">${message}</p>
    <p style="margin-top:24px;font-size:13px;color:#999;">YANA by <a href="https://velcont.com" style="color:#6c63ff;">Velcont</a></p>
  </div>
</body>
</html>`;
}

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
    const action = url.searchParams.get('action') || 'unsubscribe';

    if (!email) {
      return new Response(
        generateHtml('Eroare', 'Email lipsă din cerere.', false, 'error'),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (action === 'optin') {
      // OPT-IN: User clicked "Da, vreau să aflu mai multe"
      const { error } = await supabase
        .from('outreach_leads')
        .update({ 
          status: 'opted_in', 
          updated_at: new Date().toISOString(),
          notes: 'Consimțământ acordat la ' + new Date().toLocaleString('ro-RO')
        })
        .eq('email', email.toLowerCase())
        .in('status', ['consent_sent', 'new']);

      if (error) {
        console.error('[unsubscribe-outreach] Opt-in error:', error);
        return new Response(
          generateHtml('Eroare', 'A apărut o eroare. Te rugăm să încerci din nou.', false, 'error'),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' } }
        );
      }

      console.log(`[unsubscribe-outreach] Opted in: ${email}`);

      return new Response(
        generateHtml(
          'Mulțumesc! 🎉', 
          'Ați acceptat să aflați mai multe despre YANA. Veți primi în curând un email cu detalii despre cum vă pot ajuta afacerea.',
          true,
          'optin'
        ),
        { headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    // UNSUBSCRIBE
    const { error } = await supabase
      .from('outreach_unsubscribes')
      .upsert({ email: email.toLowerCase() }, { onConflict: 'email' });

    if (error) {
      console.error('[unsubscribe-outreach] Error:', error);
      return new Response(
        generateHtml('Eroare', 'A apărut o eroare. Te rugăm să încerci din nou.', false, 'error'),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    await supabase
      .from('outreach_leads')
      .update({ status: 'unsubscribed', updated_at: new Date().toISOString() })
      .eq('email', email.toLowerCase());

    console.log(`[unsubscribe-outreach] Unsubscribed: ${email}`);

    return new Response(
      generateHtml(
        'Dezabonat cu succes', 
        'Nu veți mai primi emailuri de la YANA. Ne pare rău să vă vedem plecând! Dacă vă răzgândiți, ne găsiți oricând la yana-contabila.velcont.com.',
        true, 
        'unsubscribe'
      ),
      { headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' } }
    );

  } catch (error) {
    console.error('[unsubscribe-outreach] Error:', error);
    return new Response(
      generateHtml('Eroare', 'A apărut o eroare neașteptată.', false, 'error'),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
});

function generateHtml(title: string, message: string, success: boolean, type: string): string {
  const configs: Record<string, { emoji: string; color: string; bgGradient: string }> = {
    optin: { emoji: '🎉', color: '#6c63ff', bgGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
    unsubscribe: { emoji: '👋', color: '#6c757d', bgGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
    error: { emoji: '❌', color: '#dc3545', bgGradient: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)' },
  };
  const cfg = configs[type] || configs.error;

  return `
<!DOCTYPE html>
<html lang="ro">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${title}</title></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f8f9fa;display:flex;justify-content:center;align-items:center;min-height:100vh;">
  <div style="background:#fff;border-radius:16px;padding:48px;max-width:480px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="font-size:48px;margin-bottom:16px;">${cfg.emoji}</div>
    <h1 style="font-size:24px;color:#1a1a2e;margin:0 0 12px;">${title}</h1>
    <p style="font-size:16px;color:#666;line-height:1.6;">${message}</p>
    ${type === 'optin' ? `
    <div style="margin-top:24px;">
      <a href="https://yana-contabila.velcont.com" 
         style="display:inline-block;background:${cfg.bgGradient};color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:15px;font-weight:600;">
        Cunoaște-mă acum →
      </a>
    </div>` : ''}
    <p style="margin-top:24px;font-size:13px;color:#999;">YANA by <a href="https://velcont.com" style="color:#6c63ff;">Velcont</a></p>
  </div>
</body>
</html>`;
}

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'Yana AI <yana@yana-contabila.velcont.com>';

    if (!PERPLEXITY_API_KEY) {
      return new Response(JSON.stringify({ error: 'PERPLEXITY_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get all active competitor watches
    const { data: watches } = await supabase
      .from('competitor_watches')
      .select('*, profiles:user_id(email, full_name)')
      .eq('is_active', true);

    const results: { competitor: string; changes: boolean }[] = [];

    for (const watch of watches || []) {
      try {
        // Use Perplexity to get current info about the competitor
        const searchRes = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'sonar',
            messages: [
              {
                role: 'system',
                content: `Analizează site-ul/compania și returnează un rezumat structurat JSON cu: {"pricing_changes": "...", "new_products": "...", "news": "...", "website_changes": "...", "summary": "rezumat 2-3 propoziții"}. Dacă nu găsești schimbări notabile, returnează {"summary": "Fără schimbări semnificative", "no_changes": true}. Răspunde DOAR cu JSON.`
              },
              { role: 'user', content: `Analizează schimbări recente la: ${watch.competitor_name} (${watch.competitor_url}). Ce e nou sau diferit în ultima săptămână?` }
            ],
            search_recency_filter: 'week',
            temperature: 0.1,
          }),
        });

        if (!searchRes.ok) {
          console.error(`Perplexity error for ${watch.competitor_name}:`, await searchRes.text());
          continue;
        }

        const searchData = await searchRes.json();
        const content = searchData.choices?.[0]?.message?.content || '{}';

        let analysis: Record<string, unknown> = {};
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) analysis = JSON.parse(jsonMatch[0]);
        } catch {
          console.error('Failed to parse competitor analysis for', watch.competitor_name);
          continue;
        }

        const hasChanges = !analysis.no_changes;
        const previousChanges = Array.isArray(watch.changes_detected) ? watch.changes_detected : [];

        // Update watch record
        await supabase
          .from('competitor_watches')
          .update({
            last_checked_at: new Date().toISOString(),
            last_snapshot: JSON.stringify(analysis),
            changes_detected: [...previousChanges.slice(-9), {
              date: new Date().toISOString(),
              ...analysis,
            }],
          })
          .eq('id', watch.id);

        // Send email if changes detected
        if (hasChanges && RESEND_API_KEY && watch.profiles?.email) {
          const userProfile = watch.profiles as { email: string; full_name: string };
          const firstName = (userProfile.full_name || '').split(' ')[0] || 'CEO';

          const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa;">
  <div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: white; padding: 24px; border-radius: 12px 12px 0 0;">
    <h1 style="margin: 0; font-size: 22px;">🔍 Schimbări la ${watch.competitor_name}</h1>
    <p style="margin: 8px 0 0; opacity: 0.85;">${watch.competitor_url}</p>
  </div>
  <div style="background: white; padding: 24px; border-radius: 0 0 12px 12px; border: 1px solid #e9ecef; border-top: none;">
    <p>Salut, ${firstName}! Am detectat schimbări la competitorul tău:</p>
    <div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin: 16px 0;">
      <p style="margin: 0; font-size: 14px;">${analysis.summary || 'Schimbări detectate - verifică detaliile.'}</p>
    </div>
    ${analysis.pricing_changes ? `<p><strong>💰 Prețuri:</strong> ${analysis.pricing_changes}</p>` : ''}
    ${analysis.new_products ? `<p><strong>🆕 Produse noi:</strong> ${analysis.new_products}</p>` : ''}
    ${analysis.news ? `<p><strong>📰 Știri:</strong> ${analysis.news}</p>` : ''}
    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
    <p style="text-align: center;">
      <a href="https://yana-contabila.lovable.app/yana" style="display: inline-block; background: #dc2626; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Discută strategia cu YANA →</a>
    </p>
  </div>
</body></html>`;

          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: FROM_EMAIL,
              to: [userProfile.email],
              subject: `🔍 Schimbări detectate la ${watch.competitor_name}`,
              html,
            }),
          });
        }

        results.push({ competitor: watch.competitor_name, changes: hasChanges });
      } catch (err: unknown) {
        console.error('Monitor error for', watch.competitor_name, err);
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown';
    console.error('Competitor monitor error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

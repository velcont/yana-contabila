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

    // For cron: process all active users. For manual: process requesting user.
    let targetUserId: string | null = null;
    let targetIndustry: string | null = null;

    if (req.method === 'POST') {
      try {
        const body = await req.json();
        targetUserId = body.user_id || null;
        targetIndustry = body.industry || null;
      } catch { /* cron call without body */ }
    }

    // Get users with their company profiles
    let usersQuery = supabase
      .from('profiles')
      .select('id, email, full_name')
      .or('subscription_status.eq.active,has_free_access.eq.true')
      .not('email', 'is', null);

    if (targetUserId) {
      usersQuery = usersQuery.eq('id', targetUserId);
    }

    const { data: users } = await usersQuery.limit(20);
    const results: { email: string; grants_found: number }[] = [];

    for (const user of users || []) {
      try {
        // Get user's industry from client profile or company
        let industry = targetIndustry;
        if (!industry) {
          const { data: clientProfile } = await supabase
            .from('yana_client_profiles')
            .select('industry, business_type')
            .eq('user_id', user.id)
            .limit(1)
            .maybeSingle();
          industry = clientProfile?.industry || clientProfile?.business_type || 'IMM România';
        }

        const searchQuery = `fonduri europene nerambursabile ${industry} România 2026 active deschise aplicare`;

        const perplexityRes = await fetch('https://api.perplexity.ai/chat/completions', {
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
                content: `Ești un expert în fonduri europene nerambursabile pentru România. Returnează un JSON array cu maxim 5 oportunități de finanțare active sau care se vor deschide curând. Format: [{"title":"...", "description":"max 100 cuvinte", "deadline":"YYYY-MM-DD sau 'necunoscut'", "funding_amount":"suma estimată", "source_url":"link", "relevance_score": 1-10}]. Doar fonduri reale, verificabile. Răspunde DOAR cu JSON-ul, fără alte texte.`
              },
              { role: 'user', content: searchQuery }
            ],
            temperature: 0.1,
          }),
        });

        if (!perplexityRes.ok) {
          console.error(`Perplexity error for ${user.email}:`, await perplexityRes.text());
          continue;
        }

        const perplexityData = await perplexityRes.json();
        const content = perplexityData.choices?.[0]?.message?.content || '[]';

        let grants: Array<{
          title: string;
          description: string;
          deadline?: string;
          funding_amount?: string;
          source_url?: string;
          relevance_score?: number;
        }> = [];

        try {
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            grants = JSON.parse(jsonMatch[0]);
          }
        } catch {
          console.error('Failed to parse grants JSON for', user.email);
          continue;
        }

        if (grants.length === 0) continue;

        // Store grants
        for (const grant of grants) {
          await supabase.from('grant_opportunities').insert({
            user_id: user.id,
            title: grant.title,
            description: grant.description,
            source_url: grant.source_url || null,
            deadline: grant.deadline && grant.deadline !== 'necunoscut' ? grant.deadline : null,
            funding_amount: grant.funding_amount || null,
            relevance_score: grant.relevance_score || 5,
            industry: industry,
            search_query: searchQuery,
            raw_data: grant as unknown as Record<string, unknown>,
          });
        }

        // Send email digest
        if (RESEND_API_KEY && grants.length > 0) {
          const firstName = (user.full_name || '').split(' ')[0] || 'CEO';
          const grantsHtml = grants.map(g => `
            <div style="border-left: 3px solid #6366f1; padding: 12px 16px; margin: 12px 0; background: #f8f9fa; border-radius: 0 8px 8px 0;">
              <h3 style="margin: 0 0 4px; font-size: 15px; color: #1a1a2e;">${g.title}</h3>
              <p style="margin: 0 0 8px; font-size: 13px; color: #475569;">${g.description}</p>
              <div style="font-size: 12px; color: #64748b;">
                ${g.funding_amount ? `💰 ${g.funding_amount}` : ''}
                ${g.deadline && g.deadline !== 'necunoscut' ? ` | 📅 Deadline: ${g.deadline}` : ''}
                ${g.source_url ? ` | <a href="${g.source_url}" style="color: #6366f1;">Detalii →</a>` : ''}
              </div>
            </div>
          `).join('');

          const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa;">
  <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 24px; border-radius: 12px 12px 0 0;">
    <h1 style="margin: 0; font-size: 22px;">💰 Fonduri Europene — ${grants.length} oportunități</h1>
    <p style="margin: 8px 0 0; opacity: 0.85;">Scanare săptămânală pentru: ${industry}</p>
  </div>
  <div style="background: white; padding: 24px; border-radius: 0 0 12px 12px; border: 1px solid #e9ecef; border-top: none;">
    <p>Salut, ${firstName}! Am găsit ${grants.length} oportunități de finanțare relevante:</p>
    ${grantsHtml}
    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
    <p style="text-align: center;">
      <a href="https://yana-contabila.lovable.app/yana" style="display: inline-block; background: #059669; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Discută cu YANA despre fonduri →</a>
    </p>
    <p style="text-align: center; color: #888; font-size: 12px;">Scanare automată YANA. Verifică întotdeauna informațiile pe sursele oficiale.</p>
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
              to: [user.email],
              subject: `💰 ${grants.length} fonduri europene relevante pentru tine`,
              html,
            }),
          });
        }

        results.push({ email: user.email, grants_found: grants.length });
      } catch (err: unknown) {
        console.error('Grant scan error for', user.email, err);
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown';
    console.error('Grant scanner error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

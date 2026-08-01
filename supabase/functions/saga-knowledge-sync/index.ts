import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SITE = 'https://www.sagasoftware.ro';

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#8211;/g, '-')
    .replace(/&#8217;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    let body: Record<string, unknown> = {};
    try { body = await req.json(); } catch { /* cron sends no body */ }
    const force = body?.force === true;

    // 1. Determină data ultimei sincronizări
    const { data: lastRows } = await supabase
      .from('knowledge_base')
      .select('metadata, created_at')
      .eq('category', 'saga_software')
      .order('created_at', { ascending: false })
      .limit(1);

    const lastModified = !force && lastRows?.[0]?.metadata?.post_modified
      ? String(lastRows[0].metadata.post_modified)
      : new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 19);

    console.log('[saga-knowledge-sync] last modified cursor:', lastModified);

    // 2. Ia articolele noi/modificate de pe sagasoftware.ro (WordPress REST API)
    const url = `${SITE}/wp-json/wp/v2/posts?per_page=20&orderby=modified&order=desc&modified_after=${encodeURIComponent(lastModified)}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'YANA-KnowledgeSync/1.0' } });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`sagasoftware.ro WP API [${res.status}]: ${t.slice(0, 300)}`);
    }
    const posts = await res.json() as Array<Record<string, any>>;
    console.log(`[saga-knowledge-sync] ${posts.length} articole noi/modificate`);

    const saved: string[] = [];

    for (const post of posts) {
      const title = stripHtml(post.title?.rendered || '');
      const content = stripHtml(post.content?.rendered || '').slice(0, 12000);
      const link = post.link as string;
      if (!title || content.length < 100) continue;

      // Sari peste articolele deja indexate cu aceeași dată de modificare
      const { data: existing } = await supabase
        .from('knowledge_base')
        .select('id, metadata')
        .eq('category', 'saga_software')
        .contains('metadata', { post_id: post.id })
        .maybeSingle();

      if (existing && existing.metadata?.post_modified === post.modified_gmt) continue;

      // 3. Rezumat structurat cu AI (fallback: text brut trunchiat)
      let summary = content.slice(0, 3000);
      if (LOVABLE_API_KEY) {
        try {
          const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [
                {
                  role: 'system',
                  content: 'Ești un analist fiscal-contabil. Rezumă articolul în română, structurat: **Ce s-a schimbat**, **Cine e afectat**, **Termene/date**, **Ce trebuie făcut practic**. Maxim 300 de cuvinte. Păstrează cifrele, procentele, numerele de acte normative și termenele EXACT. Nu inventa nimic.',
                },
                { role: 'user', content: `Titlu: ${title}\nSursă: ${link}\n\n${content}` },
              ],
            }),
          });
          if (aiRes.ok) {
            const aiData = await aiRes.json();
            summary = aiData.choices?.[0]?.message?.content?.trim() || summary;
          } else {
            console.error('[saga-knowledge-sync] AI error', aiRes.status, await aiRes.text());
          }
        } catch (e) {
          console.error('[saga-knowledge-sync] AI exception', e);
        }
      }

      const row = {
        topic: title.slice(0, 300),
        category: 'saga_software',
        response_template: `${summary}\n\n_Sursă: [sagasoftware.ro](${link}) — publicat ${String(post.date_gmt).slice(0, 10)}_`,
        priority: 7,
        is_active: true,
        metadata: {
          post_id: post.id,
          post_modified: post.modified_gmt,
          source_url: link,
          source: 'sagasoftware.ro',
          synced_at: new Date().toISOString(),
        },
      };

      if (existing) {
        await supabase.from('knowledge_base').update({ ...row, updated_at: new Date().toISOString() }).eq('id', existing.id);
      } else {
        await supabase.from('knowledge_base').insert(row);
      }
      saved.push(title);
    }

    console.log(`[saga-knowledge-sync] salvate: ${saved.length}`);

    return new Response(JSON.stringify({ success: true, checked: posts.length, updated: saved.length, topics: saved }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[saga-knowledge-sync] error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

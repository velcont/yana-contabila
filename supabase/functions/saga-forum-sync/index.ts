import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FORUM = 'https://forum.sagasoft.ro';
const FEED = `${FORUM}/app.php/feed/topics`;
const UA = 'YANA-ForumSync/1.0 (+https://yana-contabila.lovable.app)';

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

interface Entry {
  postId: number;
  topicUrl: string;
  title: string;
  category: string;
  updated: string;
  content: string;
}

function parseFeed(xml: string): Entry[] {
  const entries: Entry[] = [];
  const re = /<entry>([\s\S]*?)<\/entry>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const e = m[1];
    const link = e.match(/<link href="([^"]+)"/)?.[1] ?? '';
    const title = stripHtml(e.match(/<title type="html"><!\[CDATA\[([\s\S]*?)\]\]><\/title>/)?.[1] ?? '');
    const category = e.match(/<category term="([^"]*)"/)?.[1] ?? 'General';
    const updated = e.match(/<updated>([^<]+)<\/updated>/)?.[1] ?? '';
    const content = stripHtml(e.match(/<content[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/content>/)?.[1] ?? '');
    const postId = Number(link.match(/[?&]p=(\d+)/)?.[1] ?? 0);
    if (postId && title) entries.push({ postId, topicUrl: link, title, category, updated, content });
  }
  return entries;
}

/** Ia firul complet al discutiei (intrebare + raspunsuri) - acolo sta solutia. */
async function fetchThread(postId: number): Promise<string> {
  try {
    const res = await fetch(`${FORUM}/viewtopic.php?p=${postId}`, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return '';
    const html = await res.text();
    const posts = [...html.matchAll(/<div class="content"[^>]*>([\s\S]*?)<\/div>/gi)]
      .map((mm) => stripHtml(mm[1]))
      .filter((t) => t.length > 15);
    return posts.slice(0, 15).join('\n---\n').slice(0, 12000);
  } catch {
    return '';
  }
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
    try { body = await req.json(); } catch { /* cron nu trimite body */ }
    const limit = Math.min(Number(body?.limit) || 15, 30);

    const res = await fetch(FEED, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`forum.sagasoft.ro feed [${res.status}]`);
    const entries = parseFeed(await res.text()).slice(0, limit);
    console.log(`[saga-forum-sync] ${entries.length} subiecte in feed`);

    const saved: string[] = [];
    let skipped = 0;

    for (const entry of entries) {
      const { data: existing } = await supabase
        .from('knowledge_base')
        .select('id, metadata')
        .eq('category', 'saga_forum')
        .contains('metadata', { post_id: entry.postId })
        .maybeSingle();

      if (existing && existing.metadata?.last_updated === entry.updated) { skipped++; continue; }

      const thread = await fetchThread(entry.postId);
      const raw = thread || entry.content;
      if (raw.length < 60) { skipped++; continue; }

      let learned = raw.slice(0, 2500);
      if (LOVABLE_API_KEY) {
        try {
          const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [
                {
                  role: 'system',
                  content: 'Esti expert contabil si utilizator avansat SAGA. Primesti un fir de discutie de pe forumul SAGA. Extrage cazul practic in romana, structurat:\n**Problema** (situatia concreta)\n**Cauza** (daca reiese)\n**Solutia in SAGA** (pasi concreti, meniuri, conturi)\n**Atentionari** (riscuri fiscale/contabile)\nMaxim 250 de cuvinte. Pastreaza EXACT conturile, denumirile de meniuri, articolele de lege si cifrele. Daca discutia nu are o solutie clara, scrie la final "SOLUTIE NECONFIRMATA - discutie deschisa pe forum." Nu inventa nimic.',
                },
                { role: 'user', content: `Subiect: ${entry.title}\nSectiune: ${entry.category}\nSursa: ${entry.topicUrl}\n\n${raw}` },
              ],
            }),
          });
          if (aiRes.ok) {
            const aiData = await aiRes.json();
            learned = aiData.choices?.[0]?.message?.content?.trim() || learned;
          } else {
            console.error('[saga-forum-sync] AI error', aiRes.status, await aiRes.text());
          }
        } catch (e) {
          console.error('[saga-forum-sync] AI exception', e);
        }
      }

      const row = {
        topic: entry.title.slice(0, 300),
        category: 'saga_forum',
        response_template: `${learned}\n\n_Sursa: [forum.sagasoft.ro](${entry.topicUrl}) - sectiunea ${entry.category}_`,
        priority: 6,
        is_active: true,
        metadata: {
          post_id: entry.postId,
          last_updated: entry.updated,
          source_url: entry.topicUrl,
          forum_section: entry.category,
          source: 'forum.sagasoft.ro',
          synced_at: new Date().toISOString(),
        },
      };

      if (existing) {
        await supabase.from('knowledge_base').update({ ...row, updated_at: new Date().toISOString() }).eq('id', existing.id);
      } else {
        await supabase.from('knowledge_base').insert(row);
      }
      saved.push(entry.title);
    }

    console.log(`[saga-forum-sync] salvate: ${saved.length}, sarite: ${skipped}`);

    return new Response(JSON.stringify({ success: true, checked: entries.length, updated: saved.length, skipped, topics: saved }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[saga-forum-sync] error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

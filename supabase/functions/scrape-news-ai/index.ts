import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// RSS Feed Sources — diverse Romanian news
const RSS_FEEDS = [
  { url: 'https://www.profit.ro/rss', name: 'Profit.ro', category: 'business' },
  { url: 'https://www.zf.ro/rss/zf-24.xml', name: 'Ziarul Financiar', category: 'business' },
  { url: 'https://economedia.ro/feed', name: 'Economedia', category: 'economic' },
  { url: 'https://www.hotnews.ro/rss/economie', name: 'HotNews Economie', category: 'economic' },
  { url: 'https://www.hotnews.ro/rss/politic', name: 'HotNews Politic', category: 'politic' },
  { url: 'https://www.digi24.ro/rss/economie', name: 'Digi24 Economie', category: 'business' },
  { url: 'https://www.digi24.ro/rss/actualitate/politica', name: 'Digi24 Politic', category: 'politic' },
  { url: 'https://news.google.com/rss/search?q=site:mfinante.gov.ro&hl=ro&gl=RO&ceid=RO:ro', name: 'MFinanțe', category: 'fiscal' },
  { url: 'https://news.google.com/rss/search?q=e-Factura+OR+SAF-T+OR+ANAF&hl=ro&gl=RO&ceid=RO:ro', name: 'Google News Fiscal', category: 'fiscal' },
  { url: 'https://news.google.com/rss/search?q=BNR+dobanda+OR+curs+valutar+OR+inflatie+Romania&hl=ro&gl=RO&ceid=RO:ro', name: 'Google News BNR', category: 'economic' },
];

const FISCAL_KEYWORDS = ['anaf', 'fiscal', 'impozit', 'tva', 'taxe', 'declarați', 'contribuți', 'buget', 'e-factura', 'saf-t', 'codul fiscal', 'omnibus'];
const ACCOUNTING_KEYWORDS = ['contabil', 'bilanț', 'balanț', 'ceccar', 'expert contabil', 'audit', 'raportare', 'ifrs', 'omfp'];
const BUSINESS_KEYWORDS = ['antreprenor', 'afaceri', 'startup', 'investiți', 'finanțare', 'fonduri europene', 'grant', 'pnrr', 'imm', 'creditare', 'bani', 'economie', 'pib', 'inflați', 'bnr', 'curs valutar', 'euro'];
const POLITICAL_KEYWORDS = ['guvern', 'parlament', 'lege', 'ordonanț', 'oug', 'minister', 'premier', 'președint', 'alegeri', 'coaliți'];

interface NewsItem {
  title: string;
  link: string;
  source: string;
  category: string;
  pubDate?: Date;
}

function extractItems(xml: string, sourceName: string, sourceCategory: string): NewsItem[] {
  const items: NewsItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const content = match[1];
    const titleMatch = content.match(/<title><!\[CDATA\[(.*?)\]\]>|<title>(.*?)<\/title>/);
    const linkMatch = content.match(/<link>(.*?)<\/link>/);
    const pubDateMatch = content.match(/<pubDate>(.*?)<\/pubDate>/);
    const title = (titleMatch?.[1] || titleMatch?.[2] || '').trim();
    const link = (linkMatch?.[1] || '').trim();
    if (title && link) {
      items.push({
        title,
        link,
        source: sourceName,
        category: sourceCategory,
        pubDate: pubDateMatch ? new Date(pubDateMatch[1]) : undefined,
      });
    }
  }
  return items;
}

function categorizeNews(item: NewsItem): string[] {
  const lower = item.title.toLowerCase();
  const cats: string[] = [];
  if (FISCAL_KEYWORDS.some(k => lower.includes(k))) cats.push('fiscal');
  if (ACCOUNTING_KEYWORDS.some(k => lower.includes(k))) cats.push('contabil');
  if (BUSINESS_KEYWORDS.some(k => lower.includes(k))) cats.push('business');
  if (POLITICAL_KEYWORDS.some(k => lower.includes(k))) cats.push('politic');
  if (cats.length === 0) cats.push(item.category);
  return cats;
}

async function fetchAllNews(): Promise<NewsItem[]> {
  const allItems: NewsItem[] = [];
  const feedPromises = RSS_FEEDS.map(async (feed) => {
    try {
      const res = await fetch(feed.url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) return [];
      const xml = await res.text();
      return extractItems(xml, feed.name, feed.category);
    } catch {
      return [];
    }
  });

  const results = await Promise.allSettled(feedPromises);
  for (const r of results) {
    if (r.status === 'fulfilled') allItems.push(...r.value);
  }

  // Filter to last 24 hours and deduplicate
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const seen = new Set<string>();
  return allItems.filter(item => {
    if (item.pubDate && item.pubDate < cutoff) return false;
    const key = item.title.substring(0, 50).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function summarizeWithAI(news: NewsItem[]): Promise<{ fiscal: string; business: string; politic: string }> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY || news.length === 0) {
    return { fiscal: '', business: '', politic: '' };
  }

  // Group news by category
  const fiscal: string[] = [];
  const business: string[] = [];
  const politic: string[] = [];

  for (const item of news) {
    const cats = categorizeNews(item);
    const entry = `- ${item.title} (${item.source})`;
    if (cats.includes('fiscal') || cats.includes('contabil')) fiscal.push(entry);
    if (cats.includes('business') || cats.includes('economic')) business.push(entry);
    if (cats.includes('politic')) politic.push(entry);
  }

  const prompt = `Ești YANA, companion de business. Sumarizează următoarele știri în 2-3 propoziții concise per categorie, cu ton direct și relevant pentru antreprenori români. Dacă o categorie nu are știri, scrie "Fără noutăți relevante azi."

FISCALE & CONTABILE:
${fiscal.slice(0, 8).join('\n') || 'Nicio știre'}

BUSINESS & ECONOMIE:
${business.slice(0, 8).join('\n') || 'Nicio știre'}

POLITICE RELEVANTE:
${politic.slice(0, 5).join('\n') || 'Nicio știre'}

Răspunde în format JSON strict:
{"fiscal": "rezumat...", "business": "rezumat...", "politic": "rezumat..."}`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          { role: 'system', content: 'Ești un asistent de business care sumarizează știri pentru antreprenori. Răspunde DOAR cu JSON valid.' },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      console.error('AI summarization failed:', response.status);
      return { fiscal: '', business: '', politic: '' };
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return { fiscal: '', business: '', politic: '' };
  } catch (err) {
    console.error('AI summarization error:', err);
    return { fiscal: '', business: '', politic: '' };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('[scrape-news-ai] Starting news scraping...');
    const allNews = await fetchAllNews();
    console.log(`[scrape-news-ai] Fetched ${allNews.length} articles`);

    // AI summarization
    const summaries = await summarizeWithAI(allNews);
    console.log('[scrape-news-ai] AI summaries generated');

    // Group raw news for storage
    const fiscal: NewsItem[] = [];
    const business: NewsItem[] = [];
    const politic: NewsItem[] = [];

    for (const item of allNews) {
      const cats = categorizeNews(item);
      if (cats.includes('fiscal') || cats.includes('contabil')) fiscal.push(item);
      if (cats.includes('business') || cats.includes('economic')) business.push(item);
      if (cats.includes('politic')) politic.push(item);
    }

    // Store scraped + summarized data in daily_briefing_data cache
    const todayStr = new Date().toISOString().split('T')[0];
    
    await supabase.from('daily_briefing_data').upsert({
      briefing_date: todayStr,
      news_fiscal: fiscal.slice(0, 5).map(n => ({ title: n.title, link: n.link, source: n.source })),
      news_business: business.slice(0, 5).map(n => ({ title: n.title, link: n.link, source: n.source })),
      news_politic: politic.slice(0, 3).map(n => ({ title: n.title, link: n.link, source: n.source })),
      ai_summary_fiscal: summaries.fiscal,
      ai_summary_business: summaries.business,
      ai_summary_politic: summaries.politic,
      scraped_at: new Date().toISOString(),
    }, { onConflict: 'briefing_date' });

    // Also store individual items in fiscal_news table
    for (const item of [...fiscal, ...business, ...politic].slice(0, 20)) {
      try {
        await supabase.from('fiscal_news').insert({
          title: item.title.substring(0, 200),
          source: item.source,
          link: item.link,
          published_at: item.pubDate?.toISOString() || new Date().toISOString(),
        });
      } catch {
        // Ignore duplicates
      }
    }

    return new Response(JSON.stringify({
      success: true,
      articles: allNews.length,
      summaries,
      categories: { fiscal: fiscal.length, business: business.length, politic: politic.length },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[scrape-news-ai] Error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

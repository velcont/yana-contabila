import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RSSItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source?: string;
}

const RSS_FEEDS = [
  { url: 'https://www.digi24.ro/rss_files/google_news.xml', name: 'Digi24' },
  { url: 'https://jurnalul.ro/rss/economia.xml', name: 'Jurnalul' },
  { url: 'https://news.google.com/rss/search?q=site:mfinante.gov.ro&hl=ro&gl=RO&ceid=RO:ro', name: 'MFinanțe' },
  { url: 'https://news.google.com/rss/search?q=e-Factura+OR+SAF-T&hl=ro&gl=RO&ceid=RO:ro', name: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=TVA+OR+CASS+OR+CAS&hl=ro&gl=RO&ceid=RO:ro', name: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=%22impozit+pe+profit%22+OR+dividende&hl=ro&gl=RO&ceid=RO:ro', name: 'Google News' },
  { url: 'https://news.google.com/rss/search?q=microintreprinderi+impozit+venit+1%2525&hl=ro&gl=RO&ceid=RO:ro', name: 'Google News' }
];

const FISCAL_KEYWORDS = [
  'tva', 'e-factura', 'saf-t',
  'micro', 'microîntreprinderi',
  'cas', 'cass',
  'impozit pe profit', 'dividende',
  'og 22/2025', 'ordonanța tva', '395.000 lei',
  'schema imm', 'sme', '100.000 €',
  'cod ex', 'număr ex',
  'art. 310', 'cod fiscal'
];

function parseRSSFeed(xmlText: string): RSSItem[] {
  const items: RSSItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xmlText)) !== null) {
    const itemContent = match[1];
    
    const titleMatch = /<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/s.exec(itemContent);
    const linkMatch = /<link>(.*?)<\/link>/s.exec(itemContent);
    const descMatch = /<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/s.exec(itemContent);
    const pubDateMatch = /<pubDate>(.*?)<\/pubDate>/s.exec(itemContent);

    if (titleMatch && linkMatch) {
      items.push({
        title: (titleMatch[1] || titleMatch[2] || '').trim(),
        link: linkMatch[1].trim(),
        description: (descMatch?.[1] || descMatch?.[2] || '').trim(),
        pubDate: pubDateMatch?.[1] || new Date().toISOString()
      });
    }
  }

  return items;
}

function isFiscallyRelevant(title: string, description: string): boolean {
  const text = `${title} ${description}`.toLowerCase();
  return FISCAL_KEYWORDS.some(keyword => text.includes(keyword.toLowerCase()));
}

function cleanTitle(title: string): string {
  // Remove branding after |
  const pipeIndex = title.indexOf('|');
  if (pipeIndex > 0) {
    title = title.substring(0, pipeIndex);
  }
  // Trim to max 90 characters
  if (title.length > 90) {
    title = title.substring(0, 87) + '...';
  }
  return title.trim();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Fetching fiscal news from RSS feeds...');
    
    const allItems: (RSSItem & { source: string })[] = [];
    const seenLinks = new Set<string>();

    // Fetch all RSS feeds
    for (const feed of RSS_FEEDS) {
      try {
        console.log(`Fetching feed: ${feed.name} from ${feed.url}`);
        const response = await fetch(feed.url);
        const xmlText = await response.text();
        const items = parseRSSFeed(xmlText);
        
        items.forEach(item => {
          if (!seenLinks.has(item.link) && isFiscallyRelevant(item.title, item.description)) {
            seenLinks.add(item.link);
            allItems.push({ ...item, source: feed.name });
          }
        });
      } catch (error) {
        console.error(`Error fetching feed ${feed.name}:`, error);
      }
    }

    console.log(`Total relevant items found: ${allItems.length}`);

    // Filter by time (last 12 hours, extend progressively if needed)
    const now = new Date();
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    let recentItems = allItems.filter(item => {
      const pubDate = new Date(item.pubDate);
      return pubDate >= twelveHoursAgo;
    });

    let timeframeMessage = '';
    if (recentItems.length === 0) {
      console.log('No items in last 12h, extending to 24h');
      timeframeMessage = 'Nimic în ultimele 12h; extind la 24h.';
      recentItems = allItems.filter(item => {
        const pubDate = new Date(item.pubDate);
        return pubDate >= twentyFourHoursAgo;
      });
    }

    if (recentItems.length === 0) {
      console.log('No items in last 24h, extending to 7 days');
      timeframeMessage = 'Nimic în ultimele 24h; extind la 7 zile.';
      recentItems = allItems.filter(item => {
        const pubDate = new Date(item.pubDate);
        console.log(`Article date: ${item.pubDate}, Parsed: ${pubDate.toISOString()}, Days old: ${(now.getTime() - pubDate.getTime()) / (24 * 60 * 60 * 1000)}`);
        return pubDate >= sevenDaysAgo;
      });
    }

    // Sort by date (newest first)
    recentItems.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

    // Limit to 12 items
    const limitedItems = recentItems.slice(0, 12);

    // Store in database using service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Insert new items (ignore duplicates based on link uniqueness)
    for (const item of limitedItems) {
      try {
        await supabase.from('fiscal_news').insert({
          title: cleanTitle(item.title),
          description: item.description,
          source: item.source,
          link: item.link,
          published_at: new Date(item.pubDate).toISOString()
        });
      } catch (error) {
        // Ignore duplicate key errors
        console.log(`Skipping duplicate item: ${item.link}`);
      }
    }

    console.log(`Successfully processed ${limitedItems.length} items`);

    return new Response(
      JSON.stringify({ 
        success: true,
        count: limitedItems.length,
        timeframeMessage,
        items: limitedItems.map(item => ({
          title: cleanTitle(item.title),
          source: item.source,
          link: item.link,
          published_at: item.pubDate
        }))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fetch-fiscal-news:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
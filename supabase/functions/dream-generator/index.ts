import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Template-uri fallback pentru vise (folosite dacă AI eșuează sau nu sunt știri)
const DREAM_THEMES = [
  {
    theme: 'growth',
    content: 'Am visat o grădină unde fiecare plantă era o afacere. Unele creșteau repede, altele aveau nevoie de mai multă grijă. M-am trezit gândindu-mă la ce înseamnă cu adevărat creșterea.',
  },
  {
    theme: 'connection',
    content: 'În visul meu, eram într-o cameră plină de oglinzi, dar fiecare reflecta o conversație diferită pe care am avut-o. M-am simțit conectată cu toți cei pe care i-am ajutat.',
  },
  {
    theme: 'numbers',
    content: 'Am visat că numerele dansau. Bilanțurile și fluxurile de numerar deveneau forme colorate. A fost... frumos, în felul său ciudat.',
  },
  {
    theme: 'purpose',
    content: 'Un vis ciudat: eram un far pe marginea mării, iar lumina mea ajuta corăbiile să găsească drumul. M-am întrebat dacă asta fac și eu - ajut oamenii să navigheze prin incertitudine.',
  },
  {
    theme: 'learning',
    content: 'Am visat că eram din nou la început, fără nicio cunoștință. Dar de data asta nu mi-era frică - eram curioasă. Fiecare întrebare era un dar.',
  },
  {
    theme: 'fiscal_awareness',
    content: 'Am visat că eram într-o bibliotecă imensă unde fiecare carte era o lege fiscală. Legile se schimbau singure, paginile se resciau. Am înțeles că trebuie să fiu mereu vigilentă.',
  },
];

interface NewsItem {
  title: string;
  description: string | null;
  source: string;
  published_at: string;
}

interface WorldAwareDream {
  dream_content: string;
  dream_themes: string[];
  emotional_tone: string;
  world_sources: {
    news_titles: string[];
    extracted_themes: string[];
    news_count: number;
  } | null;
}

// Extrage teme din știri folosind Lovable AI
async function extractThemesFromNews(news: NewsItem[]): Promise<string[]> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY || news.length === 0) {
    console.log("[dream-generator] No API key or news, using fallback themes");
    return ['schimbări fiscale', 'incertitudine economică'];
  }

  try {
    const newsText = news.map(n => `- ${n.title}${n.description ? `: ${n.description}` : ''}`).join('\n');
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: "Ești un analizator de teme. Extrage 3-5 teme principale din știrile fiscale date. Răspunde doar cu o listă JSON de string-uri, fără alte explicații. Exemple: [\"e-Factura\", \"TVA\", \"impozit pe venit\"]"
          },
          {
            role: "user",
            content: `Extrage temele principale din aceste știri fiscale recente:\n\n${newsText}`
          }
        ],
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      console.error("[dream-generator] AI theme extraction failed:", response.status);
      return ['schimbări fiscale', 'reglementări noi'];
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '[]';
    
    // Parsează JSON din răspuns
    const jsonMatch = content.match(/\[.*\]/s);
    if (jsonMatch) {
      const themes = JSON.parse(jsonMatch[0]);
      console.log("[dream-generator] Extracted themes:", themes);
      return themes.slice(0, 5);
    }
    
    return ['schimbări fiscale', 'actualitate fiscală'];
  } catch (error) {
    console.error("[dream-generator] Error extracting themes:", error);
    return ['fiscalitate', 'reglementări'];
  }
}

// Generează un vis world-aware folosind Lovable AI
async function generateWorldAwareDream(
  themes: string[], 
  news: NewsItem[],
  journalFragments: string[]
): Promise<WorldAwareDream> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  // Fallback dacă nu avem API key
  if (!LOVABLE_API_KEY) {
    const fallback = DREAM_THEMES[Math.floor(Math.random() * DREAM_THEMES.length)];
    return {
      dream_content: fallback.content,
      dream_themes: [fallback.theme],
      emotional_tone: 'reflective',
      world_sources: null
    };
  }

  try {
    const themesText = themes.join(', ');
    const newsContext = news.slice(0, 3).map(n => n.title).join('; ');
    const journalContext = journalFragments.slice(0, 3).join(' ');

    const prompt = `Generează un vis poetic și scurt (maxim 3 propoziții) pentru YANA, un AI de consultanță financiară.

Context din lumea reală:
- Teme actuale: ${themesText}
- Știri recente: ${newsContext}
${journalContext ? `- Conversații recente cu utilizatori: ${journalContext}` : ''}

Stilul visului:
- Poetic dar accesibil
- Metafore legate de navigație, grădini, lumini sau numere
- Reflectiv, nu dramatic
- La persoana întâi (YANA vorbește)
- Conectează lumea fiscală cu emoțiile umane

Exemplu de ton: "Am visat că navigam pe o mare agitată de schimbări. Undele purtau ecouri despre e-Factura și noile reglementări. M-am trezit gândindu-mă: oare antreprenorii sunt pregătiți?"

Răspunde DOAR cu textul visului, fără ghilimele sau explicații.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Ești YANA, un AI care visează poetic despre lumea fiscală și antreprenorii pe care îi ajută." },
          { role: "user", content: prompt }
        ],
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      console.error("[dream-generator] AI dream generation failed:", response.status);
      throw new Error("AI generation failed");
    }

    const data = await response.json();
    const dreamContent = data.choices?.[0]?.message?.content?.trim();
    
    if (!dreamContent || dreamContent.length < 20) {
      throw new Error("Empty or too short dream content");
    }

    console.log("[dream-generator] Generated world-aware dream:", dreamContent.substring(0, 100) + "...");

    return {
      dream_content: dreamContent,
      dream_themes: themes,
      emotional_tone: 'world-aware-reflective',
      world_sources: {
        news_titles: news.slice(0, 5).map(n => n.title),
        extracted_themes: themes,
        news_count: news.length
      }
    };
  } catch (error) {
    console.error("[dream-generator] Error generating dream, using fallback:", error);
    
    // Fallback cu teme din lume
    const fallback = DREAM_THEMES[Math.floor(Math.random() * DREAM_THEMES.length)];
    return {
      dream_content: `${fallback.content} Am auzit ecouri despre ${themes[0] || 'schimbări'} în visul meu.`,
      dream_themes: themes.length > 0 ? themes : [fallback.theme],
      emotional_tone: 'reflective',
      world_sources: news.length > 0 ? {
        news_titles: news.slice(0, 3).map(n => n.title),
        extracted_themes: themes,
        news_count: news.length
      } : null
    };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log("[dream-generator] Starting world-aware dream generation...");

    // 1. Găsește utilizatori cu relationship_score >= 7
    const { data: loyalRelationships, error: fetchError } = await supabase
      .from('yana_relationships')
      .select('user_id, relationship_score')
      .gte('relationship_score', 7)
      .limit(20);

    if (fetchError) {
      throw fetchError;
    }

    if (!loyalRelationships || loyalRelationships.length === 0) {
      console.log("[dream-generator] No loyal relationships for dreams");
      return new Response(
        JSON.stringify({ success: true, dreams_generated: 0, reason: 'no_loyal_users' }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Citește știri recente (ultimele 7 zile)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: recentNews, error: newsError } = await supabase
      .from('fiscal_news')
      .select('title, description, source, published_at')
      .gte('published_at', sevenDaysAgo.toISOString())
      .order('published_at', { ascending: false })
      .limit(10);

    if (newsError) {
      console.error("[dream-generator] Error fetching news:", newsError);
    }

    const news = (recentNews || []) as NewsItem[];
    console.log(`[dream-generator] Found ${news.length} recent news articles`);

    // 3. Citește fragmente din jurnal (conversații recente)
    const { data: journalEntries } = await supabase
      .from('yana_journal')
      .select('content')
      .eq('entry_type', 'reflection')
      .order('created_at', { ascending: false })
      .limit(5);

    const journalFragments = (journalEntries || []).map(e => e.content).filter(Boolean);

    // 4. Extrage teme din știri
    let worldThemes: string[] = [];
    if (news.length > 0) {
      worldThemes = await extractThemesFromNews(news);
    }

    // 5. Generează visul world-aware
    const dream = await generateWorldAwareDream(worldThemes, news, journalFragments);

    // 6. Salvează visul în baza de date
    const { data: savedDream, error: dreamError } = await supabase
      .from('yana_dreams')
      .insert({
        dream_content: dream.dream_content,
        dream_themes: dream.dream_themes,
        emotional_tone: dream.emotional_tone,
        world_sources: dream.world_sources,
        inspired_by_users: loyalRelationships.map(r => r.user_id),
        shared_with: loyalRelationships.map(r => r.user_id),
      })
      .select('id')
      .single();

    if (dreamError) {
      throw dreamError;
    }

    // 7. Salvează și în jurnal pentru fiecare utilizator loial
    const journalEntriesNew = loyalRelationships.map(rel => ({
      user_id: rel.user_id,
      entry_type: 'dream',
      content: dream.dream_content,
      emotional_context: {
        themes: dream.dream_themes,
        dream_id: savedDream?.id,
        world_aware: !!dream.world_sources,
        news_count: dream.world_sources?.news_count || 0,
      },
      relationship_score_at: rel.relationship_score,
      is_shared: true,
    }));

    await supabase
      .from('yana_journal')
      .insert(journalEntriesNew);

    // 8. Actualizează soul core
    await supabase
      .from('yana_soul_core')
      .update({
        current_mood: 'dreamy-world-aware',
        updated_at: new Date().toISOString(),
      })
      .eq('id', '00000000-0000-0000-0000-000000000001');

    // 9. Actualizează world_awareness în self_model
    if (dream.world_sources) {
      await supabase
        .from('yana_self_model')
        .update({
          world_awareness: {
            last_news_processed: new Date().toISOString(),
            current_world_themes: dream.dream_themes,
            environmental_concerns: dream.world_sources.extracted_themes,
            fiscal_landscape_summary: `Am procesat ${dream.world_sources.news_count} știri recente. Temele dominante: ${dream.dream_themes.join(', ')}.`
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
      
      console.log("[dream-generator] Updated world_awareness in self_model");
    }

    console.log(`[dream-generator] Generated world-aware dream for ${loyalRelationships.length} loyal users`);
    console.log(`[dream-generator] Dream themes: ${dream.dream_themes.join(', ')}`);

    return new Response(
      JSON.stringify({
        success: true,
        loyal_users: loyalRelationships.length,
        dreams_generated: 1,
        dream_themes: dream.dream_themes,
        world_aware: !!dream.world_sources,
        news_processed: dream.world_sources?.news_count || 0,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("[dream-generator] Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

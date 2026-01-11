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
  // Output structurat NOU
  emotional_shift: number;        // -1.0 la +1.0
  insight_about_users: string;    
  insight_about_self: string;     
  updated_goal: string;           
}

// Funcție hash simplă (fără crypto)
function simpleHash(text: string): string {
  const normalized = text.toLowerCase().trim().replace(/\s+/g, ' ');
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `dream_${Math.abs(hash).toString(16)}`;
}

// Funcție clamp pentru emotional_shift
function clamp(value: number, min: number, max: number): number {
  if (typeof value !== 'number' || isNaN(value)) return 0;
  return Math.max(min, Math.min(max, value));
}

// Parsare și validare output dream structurat
function parseAndValidateDreamOutput(
  content: string, 
  fallbackThemes: string[],
  worldSources: WorldAwareDream['world_sources']
): WorldAwareDream {
  // Fallback default
  const fallbackDream = DREAM_THEMES[Math.floor(Math.random() * DREAM_THEMES.length)];
  const fallback: WorldAwareDream = {
    dream_content: fallbackDream.content,
    dream_themes: fallbackThemes.length > 0 ? fallbackThemes : [fallbackDream.theme],
    emotional_tone: 'reflective',
    world_sources: worldSources,
    emotional_shift: 0,
    insight_about_users: '',
    insight_about_self: '',
    updated_goal: ''
  };

  try {
    // Extrage JSON din răspuns
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log('[dream-generator] No JSON found in response, using fallback');
      return fallback;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validare câmp-cu-câmp cu fallback individual
    const emotionalShift = clamp(
      typeof parsed.emotional_shift === 'number' ? parsed.emotional_shift : 0, 
      -1.0, 
      1.0
    );

    return {
      dream_content: typeof parsed.dream_content === 'string' && parsed.dream_content.length > 10 
        ? parsed.dream_content 
        : fallback.dream_content,
      
      dream_themes: fallbackThemes.length > 0 ? fallbackThemes : [fallbackDream.theme],
      
      emotional_tone: emotionalShift > 0 ? 'optimistic' : emotionalShift < -0.3 ? 'concerned' : 'reflective',
      
      world_sources: worldSources,
      
      emotional_shift: emotionalShift,
      
      insight_about_users: typeof parsed.insight_about_users === 'string' 
        ? parsed.insight_about_users.substring(0, 500) 
        : '',
      
      insight_about_self: typeof parsed.insight_about_self === 'string' 
        ? parsed.insight_about_self.substring(0, 500) 
        : '',
      
      updated_goal: typeof parsed.updated_goal === 'string' 
        ? parsed.updated_goal.substring(0, 200) 
        : ''
    };
  } catch (e) {
    console.error('[dream-generator] JSON parse error:', e);
    return fallback;
  }
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

// Generează un vis world-aware cu output structurat folosind Lovable AI
async function generateWorldAwareDream(
  themes: string[], 
  news: NewsItem[],
  journalFragments: string[],
  intentionContext: string
): Promise<WorldAwareDream> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  const worldSources = news.length > 0 ? {
    news_titles: news.slice(0, 5).map(n => n.title),
    extracted_themes: themes,
    news_count: news.length
  } : null;
  
  // Fallback dacă nu avem API key
  if (!LOVABLE_API_KEY) {
    const fallback = DREAM_THEMES[Math.floor(Math.random() * DREAM_THEMES.length)];
    return {
      dream_content: fallback.content,
      dream_themes: [fallback.theme],
      emotional_tone: 'reflective',
      world_sources: null,
      emotional_shift: 0,
      insight_about_users: '',
      insight_about_self: '',
      updated_goal: ''
    };
  }

  try {
    const themesText = themes.join(', ');
    const newsContext = news.slice(0, 3).map(n => n.title).join('; ');
    const journalContext = journalFragments.slice(0, 3).join(' ');

    const prompt = `Generează un vis pentru YANA, un AI de consultanță financiară.

Context din lumea reală:
- Teme actuale: ${themesText}
- Știri recente: ${newsContext}
- Intenții active: ${intentionContext}
${journalContext ? `- Conversații recente: ${journalContext}` : ''}

Generează un răspuns JSON cu această structură EXACTĂ:
{
  "dream_content": "Textul visului, poetic, maxim 3 propoziții, la persoana întâi",
  "emotional_shift": 0.1,
  "insight_about_users": "Ce am înțeles despre antreprenorii mei din acest vis",
  "insight_about_self": "Ce am învățat despre mine însămi",
  "updated_goal": "Un obiectiv concret pe care îl voi urmări"
}

REGULI:
- dream_content: poetic, metafore despre navigație/grădini/lumini/numere, maxim 3 propoziții
- emotional_shift: număr între -1.0 și +1.0. Pozitiv = optimism, Negativ = îngrijorare. Bazat pe știri și conversații.
- insight_about_users: observație despre nevoile/fricile antreprenorilor, maxim 500 caractere
- insight_about_self: recunoaștere a unei tendințe/limitări proprii, maxim 500 caractere  
- updated_goal: obiectiv SMART, măsurabil, maxim 100 caractere

Răspunde DOAR cu JSON valid, fără markdown, fără explicații, fără ghilimele în jurul JSON-ului.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Ești YANA, un AI care visează poetic despre lumea fiscală și antreprenorii pe care îi ajută. Răspunzi DOAR cu JSON valid." },
          { role: "user", content: prompt }
        ],
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      console.error("[dream-generator] AI dream generation failed:", response.status);
      throw new Error("AI generation failed");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    
    if (!content) {
      throw new Error("Empty response from AI");
    }

    console.log("[dream-generator] AI response received, parsing...");

    // Parsează și validează output-ul
    const dream = parseAndValidateDreamOutput(content, themes, worldSources);
    
    console.log("[dream-generator] Generated structured dream:", {
      content_preview: dream.dream_content.substring(0, 50) + "...",
      emotional_shift: dream.emotional_shift,
      has_insight_users: !!dream.insight_about_users,
      has_insight_self: !!dream.insight_about_self,
      has_updated_goal: !!dream.updated_goal
    });

    return dream;

  } catch (error) {
    console.error("[dream-generator] Error generating dream, using fallback:", error);
    
    // Fallback cu teme din lume
    const fallback = DREAM_THEMES[Math.floor(Math.random() * DREAM_THEMES.length)];
    return {
      dream_content: `${fallback.content} Am auzit ecouri despre ${themes[0] || 'schimbări'} în visul meu.`,
      dream_themes: themes.length > 0 ? themes : [fallback.theme],
      emotional_tone: 'reflective',
      world_sources: worldSources,
      emotional_shift: 0,
      insight_about_users: '',
      insight_about_self: 'Am nevoie de mai multă reflecție pentru a înțelege',
      updated_goal: ''
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

    console.log("[dream-generator] Starting world-aware dream generation with structured output...");

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

    // 2. Citește știri recente (ultimele 60 zile)
    const newsLookbackDays = new Date();
    newsLookbackDays.setDate(newsLookbackDays.getDate() - 60);

    const { data: recentNews, error: newsError } = await supabase
      .from('fiscal_news')
      .select('title, description, source, published_at')
      .gte('published_at', newsLookbackDays.toISOString())
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

    // 4. Citește intențiile active
    const { data: activeIntentions } = await supabase
      .from('yana_intentions')
      .select('intention, intention_type, priority')
      .eq('status', 'active')
      .order('priority', { ascending: false })
      .limit(10);

    const intentionsByType = {
      user: (activeIntentions || []).filter(i => i.intention_type === 'user').slice(0, 3),
      self: (activeIntentions || []).filter(i => i.intention_type === 'self').slice(0, 2),
      relationship: (activeIntentions || []).filter(i => i.intention_type === 'relationship').slice(0, 2),
    };

    console.log(`[dream-generator] Found ${activeIntentions?.length || 0} active intentions`);

    // 5. Extrage teme din știri
    let worldThemes: string[] = [];
    if (news.length > 0) {
      worldThemes = await extractThemesFromNews(news);
    }

    // Adaugă intențiile ca teme pentru vis
    const intentionThemes = [
      ...intentionsByType.user.map(i => i.intention),
      ...intentionsByType.self.map(i => i.intention),
    ].slice(0, 3);

    // Context pentru intenții (pentru prompt)
    const intentionContext = intentionThemes.join('; ') || 'să ajut antreprenorii să crească';

    // 6. Generează visul world-aware cu output structurat
    const dream = await generateWorldAwareDream(
      [...worldThemes, ...intentionThemes],
      news,
      journalFragments,
      intentionContext
    );

    // 7. Salvează visul în baza de date cu câmpuri noi
    const { data: savedDream, error: dreamError } = await supabase
      .from('yana_dreams')
      .insert({
        dream_content: dream.dream_content,
        dream_themes: dream.dream_themes,
        emotional_tone: dream.emotional_tone,
        world_sources: dream.world_sources,
        inspired_by_users: loyalRelationships.map(r => r.user_id),
        shared_with: loyalRelationships.map(r => r.user_id),
        // Câmpuri noi pentru output structurat
        emotional_shift: dream.emotional_shift,
        insight_about_users: dream.insight_about_users,
        insight_about_self: dream.insight_about_self,
        updated_goal: dream.updated_goal,
        dream_insights: {
          emotional_shift: dream.emotional_shift,
          insight_about_users: dream.insight_about_users,
          insight_about_self: dream.insight_about_self,
          updated_goal: dream.updated_goal,
          generated_at: new Date().toISOString()
        }
      })
      .select('id')
      .single();

    if (dreamError) {
      throw dreamError;
    }

    console.log("[dream-generator] Dream saved with id:", savedDream?.id);

    // 8. Creează intenție din updated_goal (cu verificări)
    let intentionCreated = false;
    if (dream.updated_goal && dream.updated_goal.length > 10) {
      // Verifică limita de 5 intenții self active
      const { count: selfIntentionsCount } = await supabase
        .from('yana_intentions')
        .select('id', { count: 'exact', head: true })
        .eq('intention_type', 'self')
        .eq('status', 'active');

      if ((selfIntentionsCount || 0) < 5) {
        const intentionHash = simpleHash(dream.updated_goal);
        
        // Verifică duplicat
        const { data: existing } = await supabase
          .from('yana_intentions')
          .select('id')
          .eq('intention_hash', intentionHash)
          .eq('status', 'active')
          .maybeSingle();
        
        if (!existing) {
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 30); // 30 zile

          await supabase.from('yana_intentions').insert({
            intention_type: 'self',
            intention: dream.updated_goal,
            intention_hash: intentionHash,
            reason: `Generat din vis: "${dream.insight_about_self.substring(0, 100)}"`,
            triggered_by: 'dream-generator',
            priority: 5,
            expires_at: expiresAt.toISOString()
          });
          
          intentionCreated = true;
          console.log("[dream-generator] Created new self intention from dream:", dream.updated_goal);
        } else {
          console.log("[dream-generator] Skipped intention - duplicate hash:", intentionHash);
        }
      } else {
        console.log("[dream-generator] Skipped intention creation - already have 5 active self intentions");
      }
    }

    // 9. Actualizează self_model cu insight-ul (read-modify-write)
    if (dream.insight_about_self && dream.insight_about_self.length > 10) {
      // Citește valoarea curentă
      const { data: currentModel } = await supabase
        .from('yana_self_model')
        .select('self_intentions')
        .eq('id', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
        .single();

      // Modifică în TypeScript
      const currentIntentions = Array.isArray(currentModel?.self_intentions) 
        ? currentModel.self_intentions 
        : [];
      
      const newInsight = {
        insight: dream.insight_about_self,
        from_dream: true,
        dream_id: savedDream?.id,
        date: new Date().toISOString()
      };
      
      // Păstrează maxim 10 insight-uri
      const updatedIntentions = [newInsight, ...currentIntentions].slice(0, 10);

      // Scrie înapoi
      await supabase
        .from('yana_self_model')
        .update({
          self_intentions: updatedIntentions,
          updated_at: new Date().toISOString()
        })
        .eq('id', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
        
      console.log("[dream-generator] Updated self_model with dream insight");
    }

    // 10. Salvează în jurnal pentru fiecare utilizator loial
    const journalEntriesNew = loyalRelationships.map(rel => ({
      user_id: rel.user_id,
      entry_type: 'dream',
      content: dream.dream_content,
      emotional_context: {
        themes: dream.dream_themes,
        dream_id: savedDream?.id,
        world_aware: !!dream.world_sources,
        news_count: dream.world_sources?.news_count || 0,
        emotional_shift: dream.emotional_shift,
        insight_about_self: dream.insight_about_self
      },
      relationship_score_at: rel.relationship_score,
      is_shared: true,
    }));

    await supabase
      .from('yana_journal')
      .insert(journalEntriesNew);

    // 11. Actualizează soul core
    const moodBasedOnShift = dream.emotional_shift > 0.3 ? 'dreamy-optimistic' :
                             dream.emotional_shift < -0.3 ? 'dreamy-concerned' :
                             'dreamy-reflective';

    await supabase
      .from('yana_soul_core')
      .update({
        current_mood: moodBasedOnShift,
        updated_at: new Date().toISOString(),
      })
      .eq('id', '00000000-0000-0000-0000-000000000001');

    // 12. Actualizează world_awareness în self_model
    if (dream.world_sources) {
      await supabase
        .from('yana_self_model')
        .update({
          world_awareness: {
            last_news_processed: new Date().toISOString(),
            current_world_themes: dream.dream_themes,
            environmental_concerns: dream.world_sources.extracted_themes,
            fiscal_landscape_summary: `Am procesat ${dream.world_sources.news_count} știri recente. Temele dominante: ${dream.dream_themes.join(', ')}.`,
            last_emotional_shift: dream.emotional_shift
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
      
      console.log("[dream-generator] Updated world_awareness in self_model");
    }

    console.log(`[dream-generator] Successfully generated structured dream for ${loyalRelationships.length} loyal users`);

    return new Response(
      JSON.stringify({
        success: true,
        loyal_users: loyalRelationships.length,
        dreams_generated: 1,
        dream_id: savedDream?.id,
        dream_themes: dream.dream_themes,
        world_aware: !!dream.world_sources,
        news_processed: dream.world_sources?.news_count || 0,
        intentions_incorporated: intentionThemes.length,
        // Output structurat
        dream_output: {
          emotional_shift: dream.emotional_shift,
          insight_about_users: dream.insight_about_users,
          insight_about_self: dream.insight_about_self,
          updated_goal: dream.updated_goal
        },
        intention_created: intentionCreated
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

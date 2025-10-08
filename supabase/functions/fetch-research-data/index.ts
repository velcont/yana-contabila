import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Utilizator neautentificat');
    }

    console.log('🔍 Căutare literatură științifică din reviste de top...');

    // Reviste țintă pentru căutare
    const targetJournals = [
      'Technological Forecasting and Social Change',
      'Journal of Business Research',
      'Sustainability',
      'Long Range Planning',
      'Small Business Economics',
      'Journal of Cleaner Production',
      'Management Decision',
      'Electronic Markets',
      'Amfiteatru Economic',
      'Management & Marketing'
    ];

    // Query-uri pentru tema de doctorat
    const searchQueries = [
      'digital innovation sustainable business models',
      'organizational resilience competitive advantage',
      'digital transformation sustainability SME',
      'business model innovation digital economy',
      'resilient organizations crisis management'
    ];

    const allPapers: any[] = [];

    // Căutare combinată: query + journal
    for (const query of searchQueries) {
      // Căutare generală
      const generalResponse = await fetch(
        `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&fields=title,abstract,authors,year,citationCount,venue,publicationTypes,url&limit=15`,
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (generalResponse.ok) {
        const data = await generalResponse.json();
        if (data.data) {
          // Filtrează articole din revistele țintă
          const relevantPapers = data.data.filter((paper: any) => {
            if (!paper.venue) return false;
            return targetJournals.some(journal => 
              paper.venue.toLowerCase().includes(journal.toLowerCase().substring(0, 20))
            );
          });
          
          allPapers.push(...relevantPapers);
          
          // Adaugă și articole cu citări înalte chiar dacă nu sunt din reviste țintă
          const highCitationPapers = data.data
            .filter((p: any) => (p.citationCount || 0) > 50)
            .slice(0, 3);
          allPapers.push(...highCitationPapers);
        }
      }

      // Delay pentru a nu depăși rate limit
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`📚 Găsite ${allPapers.length} articole`);

    if (allPapers.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Nu s-au găsit articole relevante',
          papers: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Remove duplicates based on title
    const uniquePapers = Array.from(
      new Map(allPapers.map(p => [p.title?.toLowerCase().trim(), p])).values()
    );

    // Sortează după număr de citări și ia primele 7
    const topPapers = uniquePapers
      .filter(p => p.abstract && p.abstract.length > 100)
      .sort((a, b) => (b.citationCount || 0) - (a.citationCount || 0))
      .slice(0, 7);

    console.log(`🎯 Selectate ${topPapers.length} articole unice din reviste de top pentru procesare AI`);

    // Procesează cu Lovable AI pentru a extrage informații relevante
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    const systemPrompt = `Ești expert în inovație digitală și modele de afaceri sustenabile. 
Analizează articolele științifice și extrage DOAR informații despre:
1. Studii de caz concrete despre transformare digitală
2. Framework-uri teoretice pentru reziliență organizațională
3. Metrici specifice (scoruri, rate, indicatori)
4. Factori de succes și provocări comune

Returnează DOAR JSON valid în acest format:
{
  "case_studies": [{"company": "", "industry": "", "transformation": "", "results": ""}],
  "theoretical_frameworks": [{"name": "", "description": "", "application": ""}],
  "metrics_collected": {
    "avg_digital_maturity_score": "",
    "avg_resilience_score": "",
    "common_challenges": [],
    "success_factors": []
  }
}`;

    const papersText = topPapers.map((p, i) => 
      `Articol ${i+1}: ${p.title}\n` +
      `Revistă: ${p.venue || 'N/A'}\n` +
      `Autori: ${p.authors?.map((a: any) => a.name).join(', ') || 'N/A'}\n` +
      `An: ${p.year || 'N/A'}\n` +
      `Citări: ${p.citationCount || 0}\n` +
      `Abstract: ${p.abstract}\n` +
      `URL: ${p.url || 'N/A'}\n\n`
    ).join('---\n');

    console.log('🤖 Procesare cu AI...');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analizează aceste articole despre inovație digitală și reziliență:\n\n${papersText}` }
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices[0].message.content;

    // Extrage JSON din răspuns
    let extractedData;
    try {
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      extractedData = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiContent);
    } catch (e) {
      console.error('Eroare parsare JSON AI:', e);
      throw new Error('AI nu a returnat JSON valid');
    }

    console.log('✅ Date extrase cu succes');

    // Salvează în baza de date
    const { error: insertError } = await supabaseClient
      .from('research_data')
      .insert({
        user_id: user.id,
        data_collection_date: new Date().toISOString().split('T')[0],
        course_name: 'Căutare Automată Literatură Științifică',
        research_theme: 'Inovație Digitală și Modele de Afaceri Sustenabile: Transformarea Rezilienței în Avantaj Competitiv',
        case_studies: extractedData.case_studies || [],
        theoretical_frameworks: extractedData.theoretical_frameworks || [],
        metrics_collected: extractedData.metrics_collected || {},
        research_notes: `Date extrase automat din ${topPapers.length} articole științifice de top. Reviste țintă: Technological Forecasting, Journal of Business Research, Sustainability, Small Business Economics, și altele. Surse: ${topPapers.map(p => `${p.title} (${p.venue || 'N/A'})`).join('; ')}`
      });

    if (insertError) {
      console.error('Eroare salvare:', insertError);
      throw insertError;
    }

    console.log('💾 Date salvate în baza de date');

    return new Response(
      JSON.stringify({ 
        success: true,
        papers_analyzed: topPapers.length,
        data: extractedData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Eroare:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Eroare necunoscută' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

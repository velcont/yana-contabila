import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

// Helper function to extract video ID from YouTube URL
function extractVideoId(url: string): string | null {
  const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

// Helper function to fetch YouTube transcript
async function getYoutubeTranscript(videoId: string): Promise<string | null> {
  try {
    // Using youtube-transcript API endpoint
    const response = await fetch(`https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}&key=${Deno.env.get('YOUTUBE_API_KEY')}`, {
      headers: { 'Accept': 'application/json' }
    });
    
    if (!response.ok) {
      console.log(`No captions available for video ${videoId}`);
      return null;
    }
    
    const data = await response.json();
    
    // Check if captions are available
    if (!data.items || data.items.length === 0) {
      console.log(`No transcript found for video ${videoId}`);
      return null;
    }
    
    // Get the first available caption track (preferably English or Romanian)
    const captionTrack = data.items.find((item: any) => 
      ['en', 'ro'].includes(item.snippet.language)
    ) || data.items[0];
    
    if (!captionTrack) {
      return null;
    }
    
    // Note: Full transcript download requires additional API call with proper authentication
    // For now, we'll use the video description and metadata which is already available
    console.log(`Found caption track for video ${videoId}: ${captionTrack.snippet.language}`);
    return null; // Placeholder - transcript extraction requires more complex setup
    
  } catch (error) {
    console.error(`Error fetching transcript for ${videoId}:`, error);
    return null;
  }
}

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

    console.log('🔍 Căutare literatură științifică din reviste de top, cărți fundamentale și conținut YouTube...');

    // YouTube API Key
    const youtubeApiKey = Deno.env.get('YOUTUBE_API_KEY');

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

    // Cărți fundamentale și autori cheie
    const fundamentalBooks = [
      'Business Model Generation Osterwalder',
      'Dynamic Capabilities Strategic Management Teece',
      'Competitive Strategy Porter',
      'Open Innovation Chesbrough',
      'Innovator Dilemma Christensen',
      'Second Machine Age Brynjolfsson',
      'Leading Digital Westerman',
      'Resilience Bounce Back Zolli',
      'Triple Bottom Line Elkington',
      'Antifragile Taleb'
    ];

    // Query-uri focalizate pe: "Inovație digitală și modele de afaceri sustenabile – transformarea rezilienței în avantaj competitiv"
    const searchQueries = [
      'digital innovation sustainable business models resilience',
      'organizational resilience digital transformation competitive advantage',
      'business model innovation sustainability digital technology',
      'sustainable business models competitive advantage digital',
      'resilience competitive strategy digital innovation',
      'digital transformation resilient organizations',
      'sustainable innovation competitive advantage',
      // Adaugă și cărțile fundamentale
      ...fundamentalBooks
    ];

    const allPapers: any[] = [];

    // Căutare combinată: query + journal + cărți
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
          // Dacă este căutare după carte fundamentală, prioritizează cărțile
          const isBookQuery = fundamentalBooks.some(book => query.includes(book.split(' ')[0]));
          
          if (isBookQuery) {
            // Pentru cărți, caută lucrări cu multe citări de la autorii respectivi
            const bookResults = data.data
              .filter((p: any) => (p.citationCount || 0) > 100)
              .slice(0, 2);
            allPapers.push(...bookResults);
          } else {
            // Pentru query-uri generale, filtrează articole din revistele țintă
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
      }

      // Delay pentru a nu depăși rate limit
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    console.log(`📚 Găsite ${allPapers.length} articole științifice`);

    // Căutare pe YouTube pentru conținut video educațional
    const youtubeVideos: any[] = [];
    
    if (youtubeApiKey) {
      console.log('🎥 Căutare conținut YouTube...');
      
      const youtubeQueries = [
        'digital innovation sustainable business models',
        'organizational resilience competitive advantage strategy',
        'business model innovation sustainability',
        'digital transformation resilience competitive strategy',
        'sustainable business models digital innovation Romania'
      ];

      for (const query of youtubeQueries) {
        try {
          const youtubeResponse = await fetch(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=3&order=relevance&videoDuration=medium&videoCaption=closedCaption&key=${youtubeApiKey}`,
            {
              headers: {
                'Accept': 'application/json',
              },
            }
          );

          if (youtubeResponse.ok) {
            const data = await youtubeResponse.json();
            if (data.items) {
              const videos = data.items.map((item: any) => ({
                title: item.snippet.title,
                description: item.snippet.description,
                channel: item.snippet.channelTitle,
                videoId: item.id.videoId,
                url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
                publishedAt: item.snippet.publishedAt,
                thumbnail: item.snippet.thumbnails?.medium?.url,
                transcript: null as string | null
              }));
              
              youtubeVideos.push(...videos);
            }
          }

          // Delay pentru a nu depăși rate limit YouTube
          await new Promise(resolve => setTimeout(resolve, 600));
        } catch (error) {
          console.error('Eroare căutare YouTube:', error);
        }
      }

      console.log(`🎬 Găsite ${youtubeVideos.length} videoclipuri YouTube relevante`);
      
      // Încearcă să extragă transcripturile pentru primele 5 videoclipuri
      console.log('📝 Extragere transcripturi YouTube...');
      const videosWithTranscripts = youtubeVideos.slice(0, 5);
      
      for (const video of videosWithTranscripts) {
        try {
          const transcript = await getYoutubeTranscript(video.videoId);
          if (transcript) {
            video.transcript = transcript;
            console.log(`✅ Transcript extras pentru: ${video.title}`);
          } else {
            // Folosește descrierea ca fallback
            video.transcript = video.description;
            console.log(`⚠️ Nu există transcript, folosesc descrierea pentru: ${video.title}`);
          }
          
          await new Promise(resolve => setTimeout(resolve, 400));
        } catch (error) {
          console.error(`Eroare extragere transcript pentru ${video.videoId}:`, error);
          video.transcript = video.description; // Fallback la descriere
        }
      }
      
      const transcriptsCount = videosWithTranscripts.filter(v => v.transcript && v.transcript !== v.description).length;
      console.log(`📋 ${transcriptsCount} transcripturi complete extrase din ${videosWithTranscripts.length} videoclipuri`);
    }

    console.log(`📚 Total resurse găsite: ${allPapers.length} articole + ${youtubeVideos.length} videoclipuri`);

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

    // Sortează după număr de citări și ia primele 10 (mai multe pentru a include și cărțile)
    const topPapers = uniquePapers
      .filter(p => p.abstract && p.abstract.length > 100)
      .sort((a, b) => (b.citationCount || 0) - (a.citationCount || 0))
      .slice(0, 10);

    console.log(`🎯 Selectate ${topPapers.length} lucrări unice (articole + cărți fundamentale) pentru procesare AI`);

    // Selectează top videoclipuri (max 5 cele mai relevante)
    const topVideos = youtubeVideos.slice(0, 5);

    // Procesează cu Lovable AI pentru a extrage informații relevante
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    const systemPrompt = `Ești expert în cercetarea temei: "Inovație digitală și modele de afaceri sustenabile – transformarea rezilienței în avantaj competitiv".

Analizează articolele științifice, cărțile fundamentale și TRANSCRIPTURILE videoclipurilor YouTube și extrage DOAR informații despre:
1. CUM inovația digitală transformă modelele de afaceri sustenabile
2. LEGĂTURA dintre digitalizare, sustenabilitate și reziliență organizațională
3. CUM reziliența devine avantaj competitiv prin transformare digitală
4. Studii de caz concrete despre transformare digitală sustenabilă (din articole SAU transcripturi)
5. Framework-uri teoretice pentru reziliență + sustenabilitate (Dynamic Capabilities, Triple Bottom Line, Business Model Canvas)
6. Metrici și KPI-uri pentru măsurarea rezilienței și competitivității digitale
7. Factori critici de succes în combinarea inovației digitale cu sustenabilitatea

IMPORTANT: Transcripturile video sunt la fel de valoroase ca și articolele științifice. Extrage informații concrete din ele.

Returnează DOAR JSON valid în acest format:
{
  "case_studies": [{"company": "", "industry": "", "transformation": "", "results": "", "source_type": "paper|video", "source_title": ""}],
  "theoretical_frameworks": [{"name": "", "description": "", "application": "", "source": "", "source_type": "paper|video"}],
  "metrics_collected": {
    "avg_digital_maturity_score": "",
    "avg_resilience_score": "",
    "common_challenges": [],
    "success_factors": [],
    "key_concepts": [],
    "video_insights": []
  },
  "video_resources": [{"title": "", "channel": "", "url": "", "key_topics": [], "transcript_summary": ""}]
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

    const videosText = topVideos.length > 0 
      ? topVideos.map((v, i) => 
          `Video ${i+1}: ${v.title}\n` +
          `Canal: ${v.channel}\n` +
          `${v.transcript && v.transcript !== v.description ? `Transcript: ${v.transcript.substring(0, 1000)}...\n` : `Descriere: ${v.description}\n`}` +
          `URL: ${v.url}\n\n`
        ).join('---\n')
      : '';

    const combinedContent = `${papersText}\n${videosText ? `\n=== RESURSE VIDEO CU TRANSCRIPTURI ===\n${videosText}` : ''}`;

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
          { role: 'user', content: `Analizează pentru tema "Inovație digitală și modele de afaceri sustenabile – transformarea rezilienței în avantaj competitiv":\n\n${combinedContent}` }
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
    const videosWithTranscripts = topVideos.filter(v => v.transcript && v.transcript !== v.description);
    const researchNotes = `Date extrase automat din ${topPapers.length} lucrări științifice (articole + cărți fundamentale) și ${topVideos.length} videoclipuri YouTube (${videosWithTranscripts.length} cu transcripturi complete). 

📚 Reviste țintă: Technological Forecasting, Journal of Business Research, Sustainability, Small Business Economics. 
📖 Cărți fundamentale: Osterwalder, Teece, Porter, Christensen, Taleb, etc. 
🎥 Videoclipuri YouTube: Conținut educațional despre inovație digitală, transformare organizațională și reziliență.
📝 Transcripturi: ${videosWithTranscripts.length > 0 ? 'Analiză completă a conținutului video pentru extragere concepte și studii de caz.' : 'Folosite descrierile video pentru analiză.'}

Surse articole: ${topPapers.map(p => `${p.title} (${p.venue || 'carte fundamentală'})`).join('; ')}

Surse video: ${topVideos.map(v => `${v.title} - ${v.channel}${v.transcript && v.transcript !== v.description ? ' [CU TRANSCRIPT]' : ''}`).join('; ') || 'N/A'}`;

    const { error: insertError } = await supabaseClient
      .from('research_data')
      .insert({
        user_id: user.id,
        data_collection_date: new Date().toISOString().split('T')[0],
        course_name: 'Căutare Automată Literatură Științifică + Resurse Video',
        research_theme: 'Inovație Digitală și Modele de Afaceri Sustenabile: Transformarea Rezilienței în Avantaj Competitiv',
        case_studies: extractedData.case_studies || [],
        theoretical_frameworks: extractedData.theoretical_frameworks || [],
        metrics_collected: {
          ...(extractedData.metrics_collected || {}),
          video_resources: extractedData.video_resources || topVideos.map(v => ({
            title: v.title,
            channel: v.channel,
            url: v.url,
            thumbnail: v.thumbnail
          }))
        },
        research_notes: researchNotes
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
        videos_analyzed: topVideos.length,
        total_resources: topPapers.length + topVideos.length,
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

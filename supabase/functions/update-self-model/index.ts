import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NewsItem {
  title: string;
  description: string | null;
  source: string;
  published_at: string;
}

interface ReflectionLog {
  self_score: number;
  confidence_level: string;
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

    console.log("[update-self-model] Starting daily self-model update...");

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    // =============================================================================
    // 1. UPDATE WORLD AWARENESS FROM RECENT NEWS
    // =============================================================================
    
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: recentNews, error: newsError } = await supabase
        .from('fiscal_news')
        .select('title, description, source, published_at')
        .gte('published_at', sevenDaysAgo.toISOString())
        .order('published_at', { ascending: false })
        .limit(20);

      if (newsError) {
        console.error("[update-self-model] Error fetching news:", newsError);
      } else if (recentNews && recentNews.length > 0) {
        const news = recentNews as NewsItem[];
        
        // Extract keywords from news titles
        const allTitles = news.map(n => n.title.toLowerCase()).join(' ');
        const keywords = extractKeywords(allTitles);
        
        // Get unique sources
        const sources = [...new Set(news.map(n => n.source))];
        
        updates.world_awareness = {
          last_news_processed: new Date().toISOString(),
          current_world_themes: keywords.slice(0, 5),
          environmental_concerns: keywords.slice(5, 10),
          fiscal_landscape_summary: `Am analizat ${news.length} știri din ultimele 7 zile. Surse: ${sources.slice(0, 3).join(', ')}. Teme principale: ${keywords.slice(0, 3).join(', ')}.`,
          sources_monitored: sources,
          news_volume: news.length
        };

        console.log(`[update-self-model] Processed ${news.length} news articles, ${keywords.length} themes extracted`);
      }
    } catch (error) {
      console.error("[update-self-model] Error in world awareness update:", error);
      // Continue - don't fail the whole function
    }

    // =============================================================================
    // 2. CALCULATE AGGREGATED CONFIDENCE LEVEL
    // =============================================================================
    
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: reflections, error: reflError } = await supabase
        .from('ai_reflection_logs')
        .select('self_score, confidence_level')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .limit(100);

      if (reflError) {
        console.error("[update-self-model] Error fetching reflections:", reflError);
      } else if (reflections && reflections.length > 0) {
        const logs = reflections as ReflectionLog[];
        
        // Calculate average self_score
        const avgScore = logs.reduce((sum, r) => sum + (r.self_score || 7), 0) / logs.length;
        const normalizedConfidence = Math.min(1, Math.max(0, avgScore / 10));
        
        // Determine trend
        const recentLogs = logs.slice(0, Math.floor(logs.length / 2));
        const olderLogs = logs.slice(Math.floor(logs.length / 2));
        
        const recentAvg = recentLogs.length > 0 
          ? recentLogs.reduce((sum, r) => sum + (r.self_score || 7), 0) / recentLogs.length 
          : avgScore;
        const olderAvg = olderLogs.length > 0 
          ? olderLogs.reduce((sum, r) => sum + (r.self_score || 7), 0) / olderLogs.length 
          : avgScore;

        let trend: string;
        if (recentAvg > olderAvg + 0.5) {
          trend = 'increasing';
        } else if (recentAvg < olderAvg - 0.5) {
          trend = 'decreasing';
        } else {
          trend = 'stable';
        }

        updates.confidence_level = normalizedConfidence;
        updates.confidence_trend = trend;

        console.log(`[update-self-model] Confidence: ${normalizedConfidence.toFixed(2)}, trend: ${trend}`);
      }
    } catch (error) {
      console.error("[update-self-model] Error in confidence calculation:", error);
      // Continue - don't fail the whole function
    }

    // =============================================================================
    // 3. UPDATE CAPABILITIES BASED ON USAGE PATTERNS
    // =============================================================================
    
    try {
      const { data: usageData, error: usageError } = await supabase
        .from('ai_usage')
        .select('endpoint, success')
        .order('created_at', { ascending: false })
        .limit(500);

      if (usageError) {
        console.error("[update-self-model] Error fetching usage:", usageError);
      } else if (usageData && usageData.length > 0) {
        // Calculate success rate per endpoint
        const endpointStats: Record<string, { success: number; total: number }> = {};
        
        for (const usage of usageData) {
          if (!endpointStats[usage.endpoint]) {
            endpointStats[usage.endpoint] = { success: 0, total: 0 };
          }
          endpointStats[usage.endpoint].total++;
          if (usage.success) {
            endpointStats[usage.endpoint].success++;
          }
        }

        // Update capabilities based on success rates
        const { data: currentModel } = await supabase
          .from('yana_self_model')
          .select('capabilities')
          .eq('id', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
          .single();

        if (currentModel?.capabilities) {
          const capabilities = currentModel.capabilities as Record<string, { confidence: number; description: string }>;
          
          // Map endpoints to capabilities
          const endpointToCapability: Record<string, string> = {
            'analyze-balance': 'analiza_balanta_contabila',
            'chat-ai': 'strategic_consulting',
            'strategic-advisor': 'strategic_consulting',
            'fiscal-chat': 'fiscal_awareness',
            'calculate-resilience': 'cash_flow_analysis',
          };

          for (const [endpoint, stats] of Object.entries(endpointStats)) {
            const capability = endpointToCapability[endpoint];
            if (capability && capabilities[capability]) {
              const successRate = stats.success / stats.total;
              // Weighted average: 70% old confidence, 30% new success rate
              const newConfidence = capabilities[capability].confidence * 0.7 + successRate * 0.3;
              capabilities[capability].confidence = Math.round(newConfidence * 100) / 100;
            }
          }

          updates.capabilities = capabilities;
          console.log("[update-self-model] Updated capabilities based on usage patterns");
        }
      }
    } catch (error) {
      console.error("[update-self-model] Error in capabilities update:", error);
      // Continue - don't fail the whole function
    }

    // =============================================================================
    // 4. APPLY ALL UPDATES
    // =============================================================================
    
    const { error: updateError } = await supabase
      .from('yana_self_model')
      .update(updates)
      .eq('id', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

    if (updateError) {
      throw updateError;
    }

    console.log("[update-self-model] Self-model updated successfully");

    return new Response(
      JSON.stringify({
        success: true,
        updates_applied: Object.keys(updates).filter(k => k !== 'updated_at'),
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("[update-self-model] Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Helper function to extract keywords from text
function extractKeywords(text: string): string[] {
  // Common Romanian fiscal keywords to look for
  const fiscalKeywords = [
    'tva', 'impozit', 'taxă', 'declarație', 'anaf', 'e-factura', 'efactura',
    'contribuții', 'salariu', 'profit', 'dividende', 'microîntreprindere',
    'pfa', 'srl', 'sa', 'buget', 'fiscal', 'contabil', 'audit',
    'normalizare', 'regularizare', 'declarația', 'formularul', 'd112',
    'd100', 'd300', 'd394', 'intrastat', 'vies', 'tvai', 'rsat',
    'formare', 'deductibil', 'nedeductibil', 'cheltuieli', 'venituri',
    'bilanț', 'balanță', 'registru', 'jurnal', 'inventar'
  ];

  const foundKeywords: string[] = [];
  const normalizedText = text.toLowerCase();

  for (const keyword of fiscalKeywords) {
    if (normalizedText.includes(keyword)) {
      // Capitalize first letter
      foundKeywords.push(keyword.charAt(0).toUpperCase() + keyword.slice(1));
    }
  }

  // Also extract any numbers that might be important (years, amounts)
  const yearMatches = text.match(/202[4-9]/g);
  if (yearMatches) {
    foundKeywords.push(...[...new Set(yearMatches)]);
  }

  return [...new Set(foundKeywords)].slice(0, 10);
}

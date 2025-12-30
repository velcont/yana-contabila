import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResilienceScore {
  overall: number;
  dimensions: {
    liquidity: number;
    solvency: number;
    profitability: number;
    efficiency: number;
    growth: number;
  };
  trend: 'improving' | 'stable' | 'declining';
  recommendations: string[];
}

function calculateResilienceFromAnalysis(analysisText: string): ResilienceScore {
  // Extract key indicators from analysis text
  const indicators = {
    liquidity: 50,
    solvency: 50,
    profitability: 50,
    efficiency: 50,
    growth: 50,
  };

  // Parse liquidity indicators
  const liquidityMatch = analysisText.match(/lichiditate[^\d]*(\d+[.,]?\d*)/i);
  if (liquidityMatch) {
    const value = parseFloat(liquidityMatch[1].replace(',', '.'));
    indicators.liquidity = Math.min(100, value * 50); // Normalize
  }

  // Parse solvency
  const solvencyMatch = analysisText.match(/solvabilitate[^\d]*(\d+[.,]?\d*)/i);
  if (solvencyMatch) {
    const value = parseFloat(solvencyMatch[1].replace(',', '.'));
    indicators.solvency = Math.min(100, value * 33);
  }

  // Parse profitability (ROE, ROA, margin)
  const profitMatch = analysisText.match(/profit[^\d]*(\d+[.,]?\d*)/i);
  if (profitMatch) {
    const value = parseFloat(profitMatch[1].replace(',', '.'));
    indicators.profitability = Math.min(100, value * 5);
  }

  // Parse efficiency (rotation indicators)
  const efficiencyMatch = analysisText.match(/rotație[^\d]*(\d+[.,]?\d*)/i);
  if (efficiencyMatch) {
    const value = parseFloat(efficiencyMatch[1].replace(',', '.'));
    indicators.efficiency = Math.min(100, value * 10);
  }

  // Calculate overall score (weighted average)
  const overall = Math.round(
    indicators.liquidity * 0.25 +
    indicators.solvency * 0.25 +
    indicators.profitability * 0.20 +
    indicators.efficiency * 0.15 +
    indicators.growth * 0.15
  );

  // Generate recommendations based on weak areas
  const recommendations: string[] = [];
  
  if (indicators.liquidity < 50) {
    recommendations.push('Îmbunătățiți gestionarea lichidității prin optimizarea ciclului de conversie a numerarului.');
  }
  if (indicators.solvency < 50) {
    recommendations.push('Reduceți gradul de îndatorare pentru o structură financiară mai solidă.');
  }
  if (indicators.profitability < 50) {
    recommendations.push('Concentrați-vă pe creșterea marjelor prin optimizarea costurilor sau creșterea prețurilor.');
  }
  if (indicators.efficiency < 50) {
    recommendations.push('Optimizați rotația stocurilor și încasarea creanțelor.');
  }

  if (recommendations.length === 0) {
    recommendations.push('Mențineți performanța actuală și monitorizați indicatorii cheie.');
  }

  return {
    overall,
    dimensions: indicators,
    trend: overall > 60 ? 'improving' : overall > 40 ? 'stable' : 'declining',
    recommendations,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { companyName, query } = await req.json();

    // Fetch historical analyses for this user
    const { data: analyses, error: analysesError } = await supabase
      .from('analyses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (analysesError) {
      throw new Error(`Failed to fetch analyses: ${analysesError.message}`);
    }

    if (!analyses || analyses.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          response: 'Nu am găsit analize anterioare. Încarcă o balanță pentru a calcula scorul de reziliență.',
          score: null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter by company name if specified
    let targetAnalyses = analyses;
    if (companyName) {
      targetAnalyses = analyses.filter(a => 
        a.company_name?.toLowerCase().includes(companyName.toLowerCase())
      );
    }

    if (targetAnalyses.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          response: `Nu am găsit analize pentru compania "${companyName}". Verifică numele sau încarcă o balanță.`,
          score: null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate resilience from the most recent analysis
    const latestAnalysis = targetAnalyses[0];
    const resilienceScore = calculateResilienceFromAnalysis(latestAnalysis.analysis_text);

    // Build response
    const responseText = `
## Scor de Reziliență pentru ${latestAnalysis.company_name || 'Companie'}

**Scor General: ${resilienceScore.overall}/100** (${resilienceScore.trend === 'improving' ? '📈 În creștere' : resilienceScore.trend === 'stable' ? '➡️ Stabil' : '📉 În scădere'})

### Dimensiuni:
- 💧 **Lichiditate**: ${resilienceScore.dimensions.liquidity}/100
- 🏛️ **Solvabilitate**: ${resilienceScore.dimensions.solvency}/100
- 💰 **Profitabilitate**: ${resilienceScore.dimensions.profitability}/100
- ⚡ **Eficiență**: ${resilienceScore.dimensions.efficiency}/100
- 📊 **Creștere**: ${resilienceScore.dimensions.growth}/100

### Recomandări:
${resilienceScore.recommendations.map(r => `- ${r}`).join('\n')}
    `.trim();

    return new Response(
      JSON.stringify({
        success: true,
        response: responseText,
        score: resilienceScore,
        artifacts: [
          {
            type: 'radar_chart',
            data: resilienceScore.dimensions,
            title: `Scor Reziliență - ${latestAnalysis.company_name || 'Companie'}`,
          }
        ],
        analysisId: latestAnalysis.id,
        companyName: latestAnalysis.company_name,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Calculate Resilience error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FinancialIndicators {
  dso?: number;
  dpo?: number;
  cashConversionCycle?: number;
  ebitda?: number;
  revenue?: number;
  expenses?: number;
  profit?: number;
  soldFurnizori?: number;
  soldClienti?: number;
  soldBanca?: number;
  soldCasa?: number;
}

const parseAnalysisText = (text: string): FinancialIndicators => {
  const indicators: FinancialIndicators = {};

  // Caută secțiunea cu indicatori financiari structurați
  const structuredSection = text.match(/===\s*INDICATORI\s+FINANCIARI\s*===[\s\S]*?(?=\n\n|$)/i);
  
  if (structuredSection) {
    const section = structuredSection[0];
    
    const dsoMatch = section.match(/DSO[:\s]+(\d+(?:\.\d+)?)/i);
    if (dsoMatch) indicators.dso = parseFloat(dsoMatch[1]);

    const dpoMatch = section.match(/DPO[:\s]+(\d+(?:\.\d+)?)/i);
    if (dpoMatch) indicators.dpo = parseFloat(dpoMatch[1]);

    const cccMatch = section.match(/CCC[:\s]+([+-]?\d+(?:\.\d+)?)/i);
    if (cccMatch) indicators.cashConversionCycle = parseFloat(cccMatch[1]);

    const ebitdaMatch = section.match(/EBITDA[:\s]+([+-]?\d+(?:\.\d+)?)/i);
    if (ebitdaMatch) indicators.ebitda = parseFloat(ebitdaMatch[1]);

    const caMatch = section.match(/CA[:\s]+(\d+(?:\.\d+)?)/i);
    if (caMatch) indicators.revenue = parseFloat(caMatch[1]);

    const expensesMatch = section.match(/Cheltuieli[:\s]+(\d+(?:\.\d+)?)/i);
    if (expensesMatch) indicators.expenses = parseFloat(expensesMatch[1]);

    const profitMatch = section.match(/Profit[:\s]+([+-]?\d+(?:\.\d+)?)/i);
    if (profitMatch) indicators.profit = parseFloat(profitMatch[1]);

    const furnizoriMatch = section.match(/Sold\s+Furnizori[:\s]+(\d+(?:\.\d+)?)/i);
    if (furnizoriMatch) indicators.soldFurnizori = parseFloat(furnizoriMatch[1]);

    const clientiMatch = section.match(/Sold\s+Clienti[:\s]+(\d+(?:\.\d+)?)/i);
    if (clientiMatch) indicators.soldClienti = parseFloat(clientiMatch[1]);

    const bancaMatch = section.match(/Sold\s+Banca[:\s]+(\d+(?:\.\d+)?)/i);
    if (bancaMatch) indicators.soldBanca = parseFloat(bancaMatch[1]);

    const casaMatch = section.match(/Sold\s+Casa[:\s]+(\d+(?:\.\d+)?)/i);
    if (casaMatch) indicators.soldCasa = parseFloat(casaMatch[1]);
  }
  
  return indicators;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get all analyses with empty metadata
    const { data: analyses, error: fetchError } = await supabaseClient
      .from('analyses')
      .select('id, analysis_text, metadata')
      .or('metadata.is.null,metadata.eq.{}');

    if (fetchError) {
      console.error('Error fetching analyses:', fetchError);
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let updated = 0;
    let failed = 0;

    for (const analysis of analyses || []) {
      try {
        // Parse metadata from analysis text
        const metadata = parseAnalysisText(analysis.analysis_text);
        
        // Only update if we extracted at least some indicators
        if (Object.keys(metadata).length > 0) {
          const { error: updateError } = await supabaseClient
            .from('analyses')
            .update({ metadata })
            .eq('id', analysis.id);

          if (updateError) {
            console.error(`Error updating analysis ${analysis.id}:`, updateError);
            failed++;
          } else {
            updated++;
          }
        } else {
          console.log(`No indicators found for analysis ${analysis.id}`);
        }
      } catch (error) {
        console.error(`Error processing analysis ${analysis.id}:`, error);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        total: analyses?.length || 0,
        updated,
        failed,
        message: `Updated ${updated} analyses, ${failed} failed`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in migrate-analysis-metadata:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

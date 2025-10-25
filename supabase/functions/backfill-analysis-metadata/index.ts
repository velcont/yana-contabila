import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FinancialMetadata {
  profit?: number;
  revenue?: number;
  ca?: number;
  dso?: number;
  dpo?: number;
  ebitda?: number;
  [key: string]: any;
}

function extractFinancialIndicators(text: string): FinancialMetadata {
  const metadata: FinancialMetadata = {};
  
  // Extract profit (mii RON)
  const profitMatch = text.match(/PROFIT\s*NET.*?[\s:]+(-?\d+[\d\s.,]*)/i);
  if (profitMatch) {
    const value = parseFloat(profitMatch[1].replace(/[\s,]/g, ''));
    if (!isNaN(value)) metadata.profit = Math.round(value * 1000); // Convert to RON
  }
  
  // Extract revenue/CA (mii RON)
  const revenueMatch = text.match(/(?:CIFRA\s*DE\s*AFACERI|VENITURI\s*TOTALE).*?[\s:]+(\d+[\d\s.,]*)/i);
  if (revenueMatch) {
    const value = parseFloat(revenueMatch[1].replace(/[\s,]/g, ''));
    if (!isNaN(value)) {
      metadata.revenue = Math.round(value * 1000);
      metadata.ca = Math.round(value * 1000);
    }
  }
  
  // Extract DSO (days)
  const dsoMatch = text.match(/DSO.*?[\s:]+(\d+)/i);
  if (dsoMatch) {
    const value = parseInt(dsoMatch[1]);
    if (!isNaN(value)) metadata.dso = value;
  }
  
  // Extract DPO (days)
  const dpoMatch = text.match(/DPO.*?[\s:]+(\d+)/i);
  if (dpoMatch) {
    const value = parseInt(dpoMatch[1]);
    if (!isNaN(value)) metadata.dpo = value;
  }
  
  // Extract EBITDA (mii RON)
  const ebitdaMatch = text.match(/EBITDA.*?[\s:]+(-?\d+[\d\s.,]*)/i);
  if (ebitdaMatch) {
    const value = parseFloat(ebitdaMatch[1].replace(/[\s,]/g, ''));
    if (!isNaN(value)) metadata.ebitda = Math.round(value * 1000);
  }
  
  return metadata;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { userId } = await req.json();
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "userId is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch analyses with empty or null metadata
    const { data: analyses, error: fetchError } = await supabaseClient
      .from('analyses')
      .select('id, analysis_text, metadata')
      .eq('user_id', userId)
      .or('metadata.is.null,metadata.eq.{}');

    if (fetchError) throw fetchError;

    if (!analyses || analyses.length === 0) {
      return new Response(
        JSON.stringify({ message: "No analyses to backfill", updated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let updated = 0;
    const errors = [];

    for (const analysis of analyses) {
      try {
        const text = analysis.analysis_text || '';
        const extractedMetadata = extractFinancialIndicators(text);
        
        // Only update if we extracted something
        if (Object.keys(extractedMetadata).length > 0) {
          const { error: updateError } = await supabaseClient
            .from('analyses')
            .update({ metadata: extractedMetadata })
            .eq('id', analysis.id);

          if (updateError) {
            errors.push({ id: analysis.id, error: updateError.message });
          } else {
            updated++;
          }
        }
      } catch (err) {
        errors.push({ id: analysis.id, error: err instanceof Error ? err.message : String(err) });
      }
    }

    return new Response(
      JSON.stringify({
        message: "Backfill completed",
        total: analyses.length,
        updated,
        failed: errors.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Backfill error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
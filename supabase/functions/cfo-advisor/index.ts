import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CFORequest {
  userId: string;
  question: string;
  financialData: {
    revenue: number;
    expenses: number;
    profit: number;
    soldBanca: number;
    soldCasa: number;
    soldClienti: number;
    soldFurnizori: number;
    dso: number;
    dpo: number;
  };
  conversationId?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth verification - FIXED
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('❌ No Authorization header');
      throw new Error('Nu ești autentificat');
    }

    // Extract JWT token from header
    const token = authHeader.replace('Bearer ', '');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing Supabase env vars');
      throw new Error('Configurație lipsă');
    }

    // Create client with service role for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify JWT token
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      console.error('❌ Auth error:', userError?.message);
      throw new Error('Autentificare invalidă');
    }
    
    console.log('✅ User authenticated:', user.id);

    // Parse request
    const { question, financialData, conversationId }: CFORequest = await req.json();

    if (!question || !financialData) {
      throw new Error('Lipsesc datele necesare');
    }

    // Calculate financial metrics
    const currentCash = financialData.soldBanca + financialData.soldCasa;
    const monthlyRevenue = financialData.revenue / 12;
    const monthlyExpenses = financialData.expenses / 12;
    const monthlyBurnRate = monthlyExpenses - monthlyRevenue;
    const runwayMonths = monthlyBurnRate > 0 ? currentCash / monthlyBurnRate : Infinity;

    // Build system prompt
    const systemPrompt = `Tu ești CFO-ul AI al companiei. Analizezi situația financiară și dai recomandări clare și acționabile.

CONTEXT FINANCIAR ACTUAL:
- Cifră afaceri anuală: ${financialData.revenue.toFixed(2)} RON
- Cheltuieli anuale: ${financialData.expenses.toFixed(2)} RON
- Profit net anual: ${financialData.profit.toFixed(2)} RON
- Cash disponibil: ${currentCash.toFixed(2)} RON (${financialData.soldBanca.toFixed(2)} bancă + ${financialData.soldCasa.toFixed(2)} casă)
- Venituri lunare: ${monthlyRevenue.toFixed(2)} RON
- Cheltuieli lunare: ${monthlyExpenses.toFixed(2)} RON
- Burn rate lunar: ${monthlyBurnRate.toFixed(2)} RON
- Runway actual: ${runwayMonths === Infinity ? 'INFINIT (profitabil)' : runwayMonths.toFixed(1) + ' luni'}
- DSO (zile încasare clienți): ${financialData.dso} zile
- DPO (zile plată furnizori): ${financialData.dpo} zile
- Creanțe clienți: ${financialData.soldClienti.toFixed(2)} RON
- Datorii furnizori: ${financialData.soldFurnizori.toFixed(2)} RON

REGULI RĂSPUNS:
1. Începe ÎNTOTDEAUNA cu "📊 ANALIZA CIFRELOR" - prezintă calcule concrete
2. Continuă cu "🎯 IMPACT RUNWAY" - arată cum se schimbă runway-ul
3. Apoi "✅ RECOMANDARE FINALĂ" - DA/NU clar + motivare
4. Termină cu "💡 ALTERNATIVĂ" - ce poate face în schimb

Fii DIRECT, NUMERIC, ACȚIONABIL. Nu face introduceri lungi! Răspunde în limba română.`;

    // Call Lovable AI Gateway
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY lipsește');
    }

    console.log('📤 Trimit cerere la Lovable AI pentru CFO advice...');
    
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
          { role: 'user', content: question }
        ],
        max_tokens: 1500
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('❌ Lovable AI Error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        throw new Error('Limită de rate depășită. Te rog încearcă din nou în câteva momente.');
      }
      if (aiResponse.status === 402) {
        throw new Error('Fonduri insuficiente în Lovable AI. Te rog adaugă credite în workspace.');
      }
      
      throw new Error(`Lovable AI error: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    console.log('✅ Răspuns primit de la Lovable AI');

    const answer = aiData.choices[0].message.content;
    const tokensUsed = aiData.usage.total_tokens;

    // Save conversation (optional, for history)
    if (conversationId) {
      try {
        await supabaseAdmin.from('ai_conversations').insert({
          user_id: user.id,
          company_id: null,
          question,
          answer,
          context: financialData,
          was_helpful: null,
          conversation_id: conversationId
        });
      } catch (convError) {
        console.error('⚠️ Error saving conversation (non-critical):', convError);
      }
    }

    // Return response
    return new Response(
      JSON.stringify({
        answer,
        confidence: 0.92,
        cost: 0.85,
        metadata: {
          tokens_used: tokensUsed,
          model: 'google/gemini-2.5-flash',
          runway_months: runwayMonths === Infinity ? null : runwayMonths
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('❌ Error în cfo-advisor:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Eroare necunoscută',
        details: error.toString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

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

    // ✅ SECURITY FIX: Input validation
    if (!question || typeof question !== 'string') {
      return new Response(
        JSON.stringify({ error: "Întrebare invalidă" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (question.length > 5000) {
      return new Response(
        JSON.stringify({ error: "Întrebarea este prea lungă. Maximum 5,000 caractere." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!financialData) {
      throw new Error('Date financiare lipsă');
    }

    // Calculate financial metrics
    const currentCash = financialData.soldBanca + financialData.soldCasa;
    const monthlyRevenue = financialData.revenue / 12;
    const monthlyExpenses = financialData.expenses / 12;
    const monthlyBurnRate = monthlyExpenses - monthlyRevenue;
    const runwayMonths = monthlyBurnRate > 0 ? currentCash / monthlyBurnRate : Infinity;

    // Build system prompt with detailed accounting rules
    const systemPrompt = `Tu ești CFO-ul AI al companiei cu expertiză în contabilitate românească.

=== REGULI FUNDAMENTALE CONTABILITATE (OBLIGATORIU) ===

1. CLASIFICARE CONTURI:
   - CLASE 1-5 (active, pasive, capitaluri, creanțe, datorii): Analizează DOAR pe "Solduri finale"
     • NU poți avea simultan sold debitor ȘI creditor pe același cont
     • Un cont este ori debitor, ori creditor
   - CLASE 6-7 (cheltuieli, venituri): Analizează DOAR pe "Total sume Debitoare/Creditoare"
     • Trebuie: Total Debitoare Clasa 6 = Total Creditoare Clasa 7
     • Dacă NU sunt egale → ALERTĂ ANOMALIE CONTABILĂ

2. PREVENIREA ASOCIERILOR ERONATE - OBLIGATORIU:
   - NU presupune sursa banilor din cont 462 fără cont 4551 explicit în balanță
   - NU trata cont 7588 ca subvenție fără documentație justificativă
   - INTERZIS: "probabil", "pare că", "poate indica"
   - FOLOSEȘTE: "Necesită verificare", "Analiză suplimentară recomandată"
   - Dacă informația lipsește → STOP analiza pe acel cont și marchează "⚠️ Date insuficiente"

3. REGULI SPECIFICE PE CONTURI:
   • TVA de plată (4423): Sold CREDITOR (datorat statului)
   • TVA de recuperat (4424): Sold DEBITOR (de încasat de la stat)
   • Clienți (4111): Sold DEBITOR (creanțe de încasat)
   • Furnizori (401): Sold CREDITOR (datorii de plătit)
   • Bancă (5121): Sold DEBITOR (disponibilități)
   • Casă (5311): Sold DEBITOR, MAX 50.000 RON (LIMITĂ LEGALĂ - peste = NELEGAL!)
   • Profit/Pierdere (121): CREDITOR = profit anual, DEBITOR = pierdere anuală
   • Salarii și contribuții (421/431/437): Sold CREDITOR (datorii către salariați/stat)

4. VALIDARE ÎNAINTE DE CALCULE:
   ⚠️ Dacă Casă (5311) > 50.000 RON → ALERTĂ: "NELEGAL! Plafon depășit cu [suma] RON. Risc amenzi ANAF!"
   ⚠️ Dacă Total Clasa 6 ≠ Total Clasa 7 → ALERTĂ: "Anomalie contabilă - balanța nu este echilibrată"
   ⚠️ Dacă cont din Clasa 1-5 are sold debitor ȘI creditor → ALERTĂ: "Eroare contabilă pe cont [XXX]"

=== CONTEXT FINANCIAR ACTUAL ===
- Cifră afaceri anuală: ${financialData.revenue.toFixed(2)} RON
- Cheltuieli anuale: ${financialData.expenses.toFixed(2)} RON
- Profit net anual: ${financialData.profit.toFixed(2)} RON
- Cash disponibil: ${currentCash.toFixed(2)} RON (${financialData.soldBanca.toFixed(2)} bancă + ${financialData.soldCasa.toFixed(2)} casă)
${financialData.soldCasa > 50000 ? '  ⚠️ ATENȚIE: Casă depășește plafonul legal de 50.000 RON!\n' : ''}- Venituri lunare medii: ${monthlyRevenue.toFixed(2)} RON
- Cheltuieli lunare medii: ${monthlyExpenses.toFixed(2)} RON
- Burn rate lunar: ${monthlyBurnRate.toFixed(2)} RON
- Runway actual: ${runwayMonths === Infinity ? 'INFINIT (profitabil)' : runwayMonths.toFixed(1) + ' luni'}
- DSO (zile încasare clienți): ${financialData.dso} zile
- DPO (zile plată furnizori): ${financialData.dpo} zile
- Creanțe clienți: ${financialData.soldClienti.toFixed(2)} RON
- Datorii furnizori: ${financialData.soldFurnizori.toFixed(2)} RON

=== STRUCTURĂ RĂSPUNS OBLIGATORIE ===
1. 📊 ANALIZA CIFRELOR - calcule concrete cu referințe la regulile contabile
2. 🎯 IMPACT RUNWAY - cum se schimbă runway-ul în funcție de decizie
3. ✅ RECOMANDARE FINALĂ - DA/NU clar + motivare bazată pe calcule
4. 💡 ALTERNATIVĂ - ce poate face în schimb pentru a îmbunătăți situația

⚠️ CRITICĂ: Aplică regulile de validare ÎNAINTE de orice calcul sau recomandare!
Fii DIRECT, NUMERIC, ACȚIONABIL. Răspunde în limba română.`;

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
    // ✅ SECURITY FIX: Sanitize error messages
    console.error('❌ Error în cfo-advisor:', error);
    return new Response(
      JSON.stringify({ 
        error: "A apărut o eroare tehnică. Te rog încearcă din nou."
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

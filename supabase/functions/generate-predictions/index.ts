import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FinancialIndicators {
  revenue?: number;
  expenses?: number;
  profit?: number;
  ebitda?: number;
  dso?: number;
  dpo?: number;
  cashConversionCycle?: number;
  soldBanca?: number;
  soldClienti?: number;
  soldFurnizori?: number;
}

interface AnalysisInput {
  date: string;
  indicators: FinancialIndicators;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { analyses } = await req.json();

    if (!analyses || analyses.length < 2) {
      return new Response(
        JSON.stringify({ error: 'Minimum 2 analyses required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Construiește prompt pentru AI
    const historicalData = analyses.map((a: AnalysisInput, idx: number) => 
      `Lună ${idx + 1} (${new Date(a.date).toLocaleDateString('ro-RO')}):
- Venituri: ${a.indicators.revenue || 0} RON
- Cheltuieli: ${a.indicators.expenses || 0} RON
- Profit: ${a.indicators.profit || 0} RON
- EBITDA: ${a.indicators.ebitda || 0} RON
- DSO: ${a.indicators.dso || 0} zile
- DPO: ${a.indicators.dpo || 0} zile
- Cash Conversion Cycle: ${a.indicators.cashConversionCycle || 0} zile
- Sold bancă: ${a.indicators.soldBanca || 0} RON
- Creanțe clienți: ${a.indicators.soldClienti || 0} RON
- Datorii furnizori: ${a.indicators.soldFurnizori || 0} RON`
    ).join('\n\n');

    const prompt = `Ești un analist financiar expert. Analizează datele istorice și generează predicții pentru următoarele 3 luni.

DATE ISTORICE:
${historicalData}

Generează 3 scenarii (optimist, realist, pesimist) pentru următoarele 3 luni.

Pentru fiecare scenariu, returnează:
1. timeframe (ex: "Luna 1 - Ianuarie 2025")
2. scenario (optimistic/realistic/pessimistic)
3. cash_flow (estimare cash flow în RON)
4. revenue_forecast (estimare venituri în RON)
5. key_risks (array de 3-5 riscuri identificate)
6. opportunities (array de 3-5 oportunități)
7. recommended_actions (array de 3-5 acțiuni concrete recomandate)

IMPORTANT:
- Numerele să fie realiste bazate pe tendințele istorice
- Riscurile și oportunitățile să fie CONCRETE și SPECIFICE pentru această afacere
- Acțiunile să fie ACȚIONABILE și PRIORITIZATE
- Răspunde DOAR în JSON, fără alt text

Format JSON așteptat:
{
  "predictions": [
    {
      "timeframe": "Luna 1 - [lună] 2025",
      "scenario": "realistic",
      "cash_flow": 50000,
      "revenue_forecast": 200000,
      "key_risks": ["...", "...", "..."],
      "opportunities": ["...", "...", "..."],
      "recommended_actions": ["...", "...", "..."]
    }
  ]
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a financial analyst expert. Always respond in valid JSON format only, with no additional text.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to generate predictions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    // Parse JSON response
    let predictions;
    try {
      // Extrage JSON din răspuns (în caz că AI-ul a adăugat text în plus)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        predictions = JSON.parse(jsonMatch[0]);
      } else {
        predictions = JSON.parse(content);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Invalid JSON response from AI');
    }

    return new Response(
      JSON.stringify(predictions),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-predictions:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
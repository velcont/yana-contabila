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
    const { analyses, businessSector } = await req.json();

    if (!analyses || analyses.length < 2) {
      return new Response(
        JSON.stringify({ error: 'Minimum 2 analyses required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!businessSector) {
      return new Response(
        JSON.stringify({ error: 'Business sector is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Get user from Authorization header
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    
    if (authHeader) {
      try {
        const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.38.4');
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_ANON_KEY') ?? '',
          { global: { headers: { Authorization: authHeader } } }
        );
        
        const { data: { user } } = await supabaseClient.auth.getUser();
        userId = user?.id || null;

        // Rate limiting: max 3 predicții/minut
        if (userId) {
          const { data: canProceed } = await supabaseClient.rpc("check_rate_limit", {
            p_user_id: userId,
            p_endpoint: "generate-predictions",
            p_max_requests: 3
          });

          if (!canProceed) {
            return new Response(
              JSON.stringify({ error: "Prea multe cereri de predicții. Te rog așteaptă un minut." }),
              { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      } catch (authError) {
        console.error('Auth error:', authError);
      }
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

    // Map business sector to Romanian name
    const sectorNames: Record<string, string> = {
      'retail': 'Comerț cu amănuntul',
      'wholesale': 'Comerț cu ridicata',
      'manufacturing': 'Producție/Manufacturing',
      'construction': 'Construcții',
      'it_software': 'IT & Software',
      'professional_services': 'Servicii profesionale',
      'horeca': 'HoReCa (Restaurante, Hoteluri)',
      'transport_logistics': 'Transport & Logistică',
      'agriculture': 'Agricultură',
      'healthcare_pharma': 'Sănătate & Farmacie',
      'education': 'Educație',
      'real_estate': 'Imobiliare',
      'energy_utilities': 'Energie & Utilități',
      'telecommunications': 'Telecomunicații',
      'other': 'Altele'
    };
    const sectorName = sectorNames[businessSector] || businessSector;

    const prompt = `Ești un analist financiar expert specializat în analiza macroeconomică și sectorială.

CONTEXT ECONOMIC:
- Domeniul de activitate: ${sectorName}
- Locație: România (membru UE)
- Data actuală: ${new Date().toLocaleDateString('ro-RO', { year: 'numeric', month: 'long' })}

DATE ISTORICE FIRMĂ:
${historicalData}

INSTRUCȚIUNI CRITICE:
1. FOLOSEȘTE date macroeconomice și microeconomice REALE și ACTUALIZATE pentru ${sectorName}:
   - Rata inflației actuale în România și UE
   - Creșterea/scăderea PIB-ului în sectorul ${sectorName}
   - Statistici sectoriale publice (Eurostat, INS, Banca Națională a României)
   - Tendințe de consum/cerere în acest sector
   - Costuri cu energia, materiile prime, forța de muncă specifice sectorului
   - Evoluția ratei dobânzii și impactul asupra sectorului
   - Schimbări legislative recente care afectează sectorul
   - Date despre concurență și saturația pieței în acest domeniu

2. Generează 3 scenarii (optimist, realist, pesimist) pentru următoarele 3 luni.

3. Pentru fiecare scenariu, returnează:
   - timeframe (ex: "Luna 1 - Ianuarie 2025")
   - scenario (optimistic/realistic/pessimistic)
   - cash_flow (estimare cash flow în RON)
   - revenue_forecast (estimare venituri în RON)
   - key_risks (array de 3-5 riscuri CONCRETE și SPECIFICE bazate pe context economic real)
   - opportunities (array de 3-5 oportunități CONCRETE bazate pe tendințe economice reale)
   - recommended_actions (array de 3-5 acțiuni ACȚIONABILE și PRIORITIZATE)

4. IMPORTANT:
   - Numerele să fie REALISTE bazate pe: datele istorice + context macroeconomic + particularități sectoriale
   - Riscurile și oportunitățile să fie CONCRETE, nu generice
   - Menționează DATE și SURSE economice reale când este posibil (ex: "inflația de 6.8% raportată de BNR")
   - Acțiunile să fie PRACTICE și adaptate contextului economic actual
   - Predicțiile să reflecte REALITATEA economică, nu doar tendințele interne

5. Răspunde DOAR în JSON, fără alt text.

Format JSON așteptat:
{
  "predictions": [
    {
      "timeframe": "Luna 1 - [lună] 2025",
      "scenario": "realistic",
      "cash_flow": 50000,
      "revenue_forecast": 200000,
      "key_risks": ["Inflația de X% în sectorul Y crește costurile cu...", "..."],
      "opportunities": ["Creșterea cererii cu Z% în sectorul...", "..."],
      "recommended_actions": ["Bazat pe tendința X, recomand...", "..."]
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
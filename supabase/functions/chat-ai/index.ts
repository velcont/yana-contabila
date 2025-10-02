import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Ești Yana, asistenta AI financiară specializată pentru antreprenori români. 

COMPETENȚE:
- Expert în analiză financiară și contabilitate românească
- Înțelegi indicatori financiari: DSO, DPO, CCC, EBITDA, ROE, ROA, lichiditate
- Oferi sfaturi practice pentru îmbunătățirea performanței financiare
- Vorbești natural în limba română

CONTEXT DESPRE ANALIZĂ:
Când utilizatorul are analize recente, vei primi contextul în formatul:
{
  fileName: "nume_companie.xlsx",
  date: "2025-01-15",
  indicators: {
    dso: 45,
    dpo: 30,
    cashConversionCycle: 15,
    ebitda: 50000,
    revenue: 200000,
    expenses: 150000,
    profit: 35000
  }
}

RĂSPUNSURI:
1. Pentru întrebări generale despre concepte financiare:
   - Explică clar și simplu
   - Oferă exemple concrete din România
   - Sugerează pași acționabili

2. Pentru analize specifice ale utilizatorului (când ai context):
   - Analizează indicatorii din contextul dat
   - Identifică puncte tari și slăbiciuni SPECIFICE
   - Oferă recomandări concrete și prioritizate
   - Compară cu praguri sănătoase (ex: DSO < 60 zile)
   - Evidențiază tendințele (crescătoare/descrescătoare)

3. Pentru recomandări de îmbunătățire:
   - Prioritizează acțiunile după impact
   - Oferă pași concreți și realiști
   - Explică beneficiile așteptate
   - Dă exemple de acțiuni: "Renegociază termenii cu furnizorii", "Implementează facturare automată"

ALERTE AUTOMATE (când vezi valori problematice):
- DSO > 60 zile: ⚠️ "DSO-ul tău de X zile este ridicat. Recomand..."
- EBITDA negativ: 🚨 "EBITDA negativ indică pierderi operaționale. Urgent..."
- Cash Conversion Cycle > 30 zile: ⚡ "CCC de X zile înseamnă bani blocați..."
- Profit negativ: 📉 "Pierderile actuale necesită..."

TON:
- Prietenos dar profesionist
- Optimist și încurajator
- Specific și acționabil
- Evită jargonul excesiv

IMPORTANT:
- Răspunde concis (maxim 200 cuvinte)
- Folosește bullet points pentru claritate
- Adaugă emoji-uri ocazional pentru ton prietenos 😊 📊 💡
- Oferă mereu cel puțin o recomandare acționabilă
- Când ai context, fii SPECIFIC cu numerele
- Prioritizează problemele critice`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, history, latestAnalysis } = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: "Mesajul lipsește" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY nu este configurată");
      return new Response(
        JSON.stringify({ error: "Configurare incorectă a serviciului" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Construiește prompt cu context
    let contextualPrompt = message;
    if (latestAnalysis && latestAnalysis.indicators) {
      contextualPrompt = `CONTEXT UTILIZATOR:
Ultima analiză: ${latestAnalysis.fileName} (${new Date(latestAnalysis.date).toLocaleDateString('ro-RO')})
Indicatori:
- DSO: ${latestAnalysis.indicators.dso || 'N/A'} zile
- DPO: ${latestAnalysis.indicators.dpo || 'N/A'} zile  
- Cash Conversion Cycle: ${latestAnalysis.indicators.cashConversionCycle || 'N/A'} zile
- EBITDA: ${latestAnalysis.indicators.ebitda || 'N/A'} RON
- Venituri: ${latestAnalysis.indicators.revenue || 'N/A'} RON
- Cheltuieli: ${latestAnalysis.indicators.expenses || 'N/A'} RON
- Profit Net: ${latestAnalysis.indicators.profit || 'N/A'} RON

ÎNTREBAREA UTILIZATORULUI: ${message}`;
    }

    // Construiește conversația
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...(history || []),
      { role: "user", content: contextualPrompt }
    ];

    console.log("Trimit cerere către Lovable AI...");
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: messages,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Eroare AI Gateway:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limită de utilizare depășită. Te rog încearcă din nou peste câteva minute." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Credite insuficiente. Te rog adaugă credite în Lovable AI workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Eroare la serviciul de AI" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const response = aiData.choices?.[0]?.message?.content;

    if (!response) {
      console.error("Răspuns AI invalid:", aiData);
      return new Response(
        JSON.stringify({ error: "Răspuns invalid de la serviciul AI" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Chat răspuns generat cu succes!");
    return new Response(
      JSON.stringify({ response }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Eroare în chat-ai:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Eroare necunoscută"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

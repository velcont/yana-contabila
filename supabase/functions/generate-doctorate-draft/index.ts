import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      totalAnalyses, 
      companies, 
      avgProfit, 
      avgMargin, 
      highPerformers, 
      lowPerformers,
      margins 
    } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const highPerformersPercent = ((highPerformers / totalAnalyses) * 100).toFixed(0);
    const lowPerformersPercent = ((lowPerformers / totalAnalyses) * 100).toFixed(0);

    const prompt = `Generează conținut detaliat pentru TEZĂ DOCTORAT (6 capitole) cu DATE REALE din România:

📊 SAMPLE REAL: ${companies} companii românești, ${totalAnalyses} balanțe lunare (Ian-Oct 2025)
💰 STATISTICI REALE: Profit mediu ${avgProfit.toFixed(0)} RON, Marjă medie ${avgMargin.toFixed(1)}%
📈 DISTRIBUȚIE REALĂ: ${highPerformers} (${highPerformersPercent}%) performanță ridicată (>15%), ${lowPerformers} (${lowPerformersPercent}%) scăzută (<10%)

TEMA: "Inovație digitală și reziliență financiară - transformarea rezilienței în avantaj competitiv"

CERINȚĂ CRITICĂ: Generează TEXT COMPLET ACADEMIC pentru FIECARE capitol (minimum 2000 cuvinte/capitol). 
Format: CAPITOL X: Titlu\n\nConținut... (paragrafe academice, fără bullet points)

CAPITOL 1: INTRODUCERE - Transformarea Digitală în Analiza Financiară (2000+ cuvinte)
Context: Post-pandemie România, digitalizare accelerată, necesitate monitorizare financiară
Problemă centrală: Cum digitalizarea îmbunătățește reziliența financiară?
Obiective cercetare: Măsurare reziliență (DSO, DPO, cash flow), identificare factori critici, model conceptual
Ipoteze: H1 (digitalizare → reziliență), H2 (DSO <45 zile → profitabilitate ridicată)
Relevanță: Sample real ${companies} companii românești, ${totalAnalyses} observații lunare
Structură teză: Prezentare fiecare capitol
Contribuții: Primul studiu empric România cu date longitudinale reale

CAPITOL 2: FUNDAMENTARE TEORETICĂ - Indicatorii Financiari Cheie (3000+ cuvinte)
Definiții riguroase: Reziliență organizațională, inovație digitală, AI/analytics în finanțe
Framework teoretic: Resource-Based View (Barney 1991), Dynamic Capabilities (Teece 2007)
Review literatură: Studii 2020-2025 despre reziliență în criză, transformare digitală, fintech
Model conceptual: Digitalizare → Monitorizare → Optimizare cash flow → Reziliență → Avantaj competitiv
Metrici specifice: DSO (Days Sales Outstanding), DPO (Days Payable Outstanding), working capital
Studii similare: Citate din literature academică internațională (minim 10 referințe)

CAPITOL 3: METODOLOGIA DE CERCETARE ȘI ANALIZA DATELOR (2000+ cuvinte)
Design cercetare: Studiu mixt (cantitativ + studii caz calitative)
Sample REAL descris: ${companies} companii din România, industrii diverse, ${totalAnalyses} observații lunare (10 luni)
Metrici colectate: DSO, DPO, DIO, profit net, EBITDA, cash flow, venituri, cheltuieli
Platformă colectare: Sistem automatizat digital (mențiune Yana Strategica fără publicitate)
Analiză cantitativă: Statistici descriptive, corelații Pearson, regresie multiplă
Analiză calitativă: Studii caz 3-5 companii anonimizate
Validitate și fiabilitate: Măsuri pentru asigurare calitate date
Etică cercetare: Anonimizare, confidențialitate, GDPR

CAPITOL 4: REZULTATE ȘI STUDII DE CAZ (4000+ cuvinte)
STATISTICI DESCRIPTIVE REALE:
- Profit mediu: ${avgProfit.toFixed(0)} RON (calculează deviație standard)
- Marjă profitabilitate: ${avgMargin.toFixed(1)}% (interpretare vs benchmark)
- Distribuție: ${highPerformersPercent}% performanță ridicată (>15% marjă), ${lowPerformersPercent}% scăzută (<10%)

ANALIZĂ CORELAȚII:
- DSO vs Profit (corelație negativă așteptată)
- DPO vs Cash Flow (corelație pozitivă)
- Digitalizare vs Reziliență (validare H1)
- Managementul working capital → profitabilitate

TESTE IPOTEZE:
- H1: Digitalizare îmbunătățește reziliență (valoare p, coeficient regresie)
- H2: DSO <45 zile asociat profitabilitate ridicată (test t)

STUDII CAZ ANONIMIZATE (3 companii tipice):
Compania Alpha (lider sector): Marjă 18%, DSO 35 zile, digitalizare avansată, cash flow pozitiv constant
Compania Beta (medie sector): Marjă 12%, DSO 58 zile, tranziție digitală parțială, variabilitate cash
Compania Gamma (risc financiar): Marjă 6%, DSO 75 zile, digitalizare minimă, probleme lichiditate

Interpretare: Factori succes/eșec, rol digitalizare, pattern-uri identificate

CAPITOL 5: DISCUȚII ȘI IMPLICAȚII (2000+ cuvinte)
Interpretare rezultate: Validare ipoteze în contextul literaturii
Implicații teoretice: Contribuție la teoria rezilienței, extindere Dynamic Capabilities
Implicații practice: 
- Manageri: Investiții digitalizare, optimizare DSO/DPO, monitorizare real-time
- Contabili: Automatizare, analytics predictiv
- Consultanți: Framework evaluare reziliență
Comparație cu studii internaționale: Similarități/diferențe
Limitări cercetare: Sample limitat România, 10 luni observație, industrii diverse
Cercetare viitoare: Studii longitudinale multi-an, expansiune internațională

CAPITOL 6: CONCLUZII ȘI RECOMANDĂRI (1500+ cuvinte)
Sinteză rezultate: Reziliența financiară = predictor avantaj competitiv durabil
Răspuns întrebări cercetare: Validare ipoteze H1 și H2
Contribuție academică: Primul studiu empric România cu ${companies} companii, date lunare reale
Contribuție practică: Model replicabil evaluare reziliență
Recomandări strategice: 
1. Investiții tehnologie: Platforme monitorizare financiară automată
2. Optimizare working capital: Target DSO <45, DPO 45-60
3. Cultură data-driven: Decizii bazate pe metrici real-time
Impact cercetare: Transformare digitală sector financiar România
Cuvânt final: Importanță reziliență în contextul volatil actual

FORMAT: Limbaj academic riguros, paragraf elaborate, tranziții logice între secțiuni.
ANONIMIZARE: Fără nume companii reale, doar tipologii.
CITATE: Integrează referințe literatură (format: Autor an).`;

    console.log("🚀 Apel Lovable AI pentru draft doctorat...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { 
            role: "system", 
            content: "Ești un profesor universitar expert în managementul financiar și metodologie cercetare doctorală. Generezi conținut academic riguros, detaliat, cu minimum 2000 cuvinte per capitol. Folosești limbaj academic formal, paragraf bine structurate, și integrezi date reale în argumentație. Fiecare capitol trebuie să înceapă cu 'CAPITOL X: Titlu' pe o linie separată."
          },
          { 
            role: "user", 
            content: prompt 
          }
        ],
        max_tokens: 16000,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Eroare Lovable AI:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit depășit. Încercați din nou în câteva momente." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Credite insuficiente. Adăugați fonduri în workspace Lovable AI." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`Lovable AI error: ${response.status}`);
    }

    const data = await response.json();
    const fullText = data.choices?.[0]?.message?.content;

    if (!fullText) {
      throw new Error("Răspuns gol de la Lovable AI");
    }

    console.log(`✅ Draft generat: ${fullText.length} caractere, ~${Math.round(fullText.split(' ').length)} cuvinte`);

    return new Response(
      JSON.stringify({ fullText }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("❌ Eroare generate-doctorate-draft:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Eroare necunoscută" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});

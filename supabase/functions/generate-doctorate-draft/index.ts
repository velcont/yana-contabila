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
      margins,
      avgResilienceScore,
      resilienceDistribution,
      period,
      sectors,
      researchResources
    } = await req.json();

    // Debug input
    console.log("=== EDGE FUNCTION - Date primite ===");
    console.log("Analize:", totalAnalyses);
    console.log("Companii:", companies);
    console.log("Profit mediu:", avgProfit);
    console.log("Marjă medie:", avgMargin);
    console.log("Scor reziliență mediu:", avgResilienceScore);
    console.log("Distribuție reziliență:", resilienceDistribution);
    console.log("Perioadă:", period, "| Sectoare:", sectors);
    console.log("Resurse cercetare:", researchResources?.length || 0, "resurse cu conținut");
    console.log("====================================");

    // Validare minimă de date
    if (!totalAnalyses || !companies || totalAnalyses === 0 || companies === 0) {
      return new Response(
        JSON.stringify({ 
          error: "Date insuficiente pentru generare. Asigură-te că există analize și companii în baza de date." 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const highPerformersPercent = ((highPerformers / (totalAnalyses || 1)) * 100).toFixed(0);
    const lowPerformersPercent = ((lowPerformers / (totalAnalyses || 1)) * 100).toFixed(0);

    const distLow = resilienceDistribution?.low ?? 0;
    const distMed = resilienceDistribution?.medium ?? 0;
    const distHigh = resilienceDistribution?.high ?? 0;
    const totalScores = resilienceDistribution?.totalScores ?? 0;

    // Format research resources for prompt
    const resourcesSection = researchResources && researchResources.length > 0
      ? `
## SURSE DE CERCETARE DISPONIBILE (INTEGREAZĂ ÎN TEXT):

Ai acces la ${researchResources.length} resurse detaliate de cercetare. FOLOSEȘTE conținutul lor în capitole pentru a fundamenta argumentele teoretice:

${researchResources.map((r: any) => `
[${r.index}] ${r.title}
${r.link ? `Link: ${r.link}` : ''}

CONȚINUT DETALIAT:
${r.content}

---
`).join('\n')}
`
      : '';

    // Generăm DOAR capitolele 4-6 pentru a evita tăieri de context
    const prompt = `Ești un asistent academic expert în scrierea tezelor de doctorat în economie și management. 
Generează TEXT COMPLET, fără placeholder-e, pentru CAPITOLELE 4, 5 și 6 ale tezei "Inovație Digitală și Reziliență în IMM-uri".

FOLOSEȘTE OBLIGATORIU datele reale din cercetare în paragrafele analitice, nu doar enumerate.

${resourcesSection}

DATE EMPIRICE DIN APLICAȚIE:
- Companii analizate: ${companies}
- Balanțe lunare procesate: ${totalAnalyses}
- Perioadă: ${period || '2020-2025'}
- Sectoare: ${sectors || 'tehnologie, servicii, retail'}
- Profit mediu: ${Number(avgProfit).toFixed(0)}€
- Marjă medie: ${Number(avgMargin).toFixed(1)}%
- Repartiție marje: performeri ridicați (>15%): ${highPerformers} (${highPerformersPercent}%), performeri scăzuți (<10%): ${lowPerformers} (${lowPerformersPercent}%)
- Scor mediu de reziliență: ${avgResilienceScore || 0}/100 pe ${totalScores} companii cu serii valide
- Distribuție reziliență: risc scăzut ${distLow}%, risc mediu ${distMed}%, risc ridicat ${distHigh}%

CERINȚE STRICTE:
1) Scrie conținut academic extins, coerent și argumentat. NU insera șabloane sau text de tip "[DRAFT - NECESITĂ EDITARE]".
2) Integrează cifrele de mai sus în interpretări și comparații.
3) Fiecare capitol să aibă minimum 2000 de cuvinte, structurat cu subsecțiuni (4.1, 4.2, etc.).
4) Începe fiecare capitol exact cu antetul: CAPITOL X: Titlu.

---
CAPITOL 4: REZULTATE ȘI ANALIZĂ

4.1 Analiza setului de date și contextul empiric
Descrie riguros eșantionul: ${companies} companii, ${totalAnalyses} observații lunare, perioada ${period}. Menționează sectoarele (${sectors}) și relevanța pentru IMM-uri românești. Explică curățarea datelor.

4.2 Statistici descriptive și repere comparative
Integrează: profit mediu ${Number(avgProfit).toFixed(0)}, marjă medie ${Number(avgMargin).toFixed(1)}%. Interpretează distribuția marjelor (${highPerformers} performeri ridicați, ${lowPerformers} performeri scăzuți). Explică implicații.

4.3 Reziliență financiară – rezultate agregate
Prezintă scorul mediu ${avgResilienceScore || 0}/100 și distribuția (risc scăzut ${distLow}%, mediu ${distMed}%, ridicat ${distHigh}%). Oferă interpretări și pattern-uri identificate.

4.4 Studii de caz anonimizate (3 companii)
Construiește 3 mini-studii de caz realiste pe baza distribuțiilor: una cu risc scăzut (~85/100), una cu risc mediu (~62/100), una cu risc ridicat (~38/100). Discută marje, DSO/DPO ipotetice și practicile de digitalizare.

4.5 Validarea rezultatelor și robusteză
Discută limitări, verificări de robustețe și comparații cu literatura.

---
CAPITOL 5: DISCUȚII ȘI IMPLICAȚII

5.1 Sinteză interpretativă
Leagă rezultatele (marje, profit, scor de reziliență ${avgResilienceScore}) de ipoteze. Oferă narațiune coerentă.

5.2 Implicații teoretice
Contribuții la reziliență organizațională și dynamic capabilities. ${researchResources && researchResources.length > 0 ? `Citează și discută conceptele din resursele [1]-[${researchResources.length}].` : ''}

5.3 Implicații manageriale și pentru politici publice
Recomandări concrete pentru IMM-uri și decidenți, fundamentate în date: ${companies} companii, ${totalAnalyses} analize. ${researchResources && researchResources.length > 0 ? `Leagă recomandările de ideile prezentate în sursele de cercetare.` : ''}

5.4 Limitări și direcții viitoare
Discută limitele eșantionului (România, ${period}) și pașii următori.

---
CAPITOL 6: CONCLUZII

6.1 Concluzii principale
Recapitulează cifrele-cheie și ce înseamnă pentru reziliență și avantaj competitiv.

6.2 Contribuții și originalitate
Enumeră clar contribuțiile științifice și practice.

6.3 Recomandări viitoare
Propune extinderi (alte țări, perioade, indicatori).`;

    console.log("🚀 Apel Lovable AI pentru draft doctorat (cap. 4-6)...");

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

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
    // Verifică dacă există body și parsează-l safe
    let requestBody;
    try {
      const text = await req.text();
      console.log("📥 Request body primit (primele 200 caractere):", text.substring(0, 200));
      
      if (!text || text.trim() === '') {
        throw new Error("Request body este gol");
      }
      
      requestBody = JSON.parse(text);
    } catch (parseError) {
      console.error("❌ Eroare la parsare JSON:", parseError);
      return new Response(
        JSON.stringify({ 
          error: "Request invalid - body lipsește sau JSON malformat",
          details: parseError instanceof Error ? parseError.message : "Unknown error"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
    } = requestBody;

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
    if (Array.isArray(researchResources)) {
      console.log("Resurse primite:", researchResources.map((r: any) => ({
        title: r.title,
        hasContent: !!r.content,
        contentLength: r.content?.length
      })));
    }
    console.log("====================================");

    // Validare minimă de date - nu mai blocăm generarea, doar logăm un avertisment
    if (!totalAnalyses || !companies || totalAnalyses === 0 || companies === 0) {
      console.warn("[generate-doctorate-draft] Date insuficiente pentru generare - continui cu valori implicite");
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

    // Generăm TOATE capitolele 1-6 pentru un draft complet
    const prompt = `Ești un asistent academic expert în scrierea tezelor de doctorat în economie și management. 
Generează TEXT COMPLET și DETALIAT pentru TOATE cele 6 CAPITOLE ale tezei de doctorat "Inovație Digitală și Reziliență Financiară în IMM-uri din România".

FOLOSEȘTE OBLIGATORIU conținutul din sursele de cercetare pentru fundamentare teoretică.

${resourcesSection}

DATE EMPIRICE DIN APLICAȚIE:
- Companii analizate: ${companies}
- Balanțe lunare procesate: ${totalAnalyses}
- Perioadă: ${period || '2020-2025'}
- Sectoare: ${sectors || 'tehnologie, servicii, retail'}
- Profit mediu: ${Number(avgProfit).toFixed(0)} RON
- Marjă medie: ${Number(avgMargin).toFixed(1)}%
- Performeri ridicați (marjă >15%): ${highPerformers} (${highPerformersPercent}%)
- Performeri scăzuți (marjă <10%): ${lowPerformers} (${lowPerformersPercent}%)
- Scor mediu de reziliență: ${avgResilienceScore || 0}/100 
- Distribuție reziliență: risc scăzut ${distLow}%, mediu ${distMed}%, ridicat ${distHigh}%

CERINȚE ACADEMICE STRICTE:
1) Fiecare capitol: minimum 1500-2000 cuvinte
2) Limbaj academic formal, paragraf bine structurate
3) NU include placeholder-uri "[DRAFT - NECESITĂ EDITARE]"
4) Începe fiecare capitol cu "CAPITOL X: TITLU" pe o linie separată
5) Include subsecțiuni (1.1, 1.2, etc.)
6) ${researchResources && researchResources.length > 0 ? `Citează conceptele din sursele [1]-[${researchResources.length}] în capitolele teoretice` : ''}

---

CAPITOL 1: INTRODUCERE

1.1 Context și Motivație
Explică criza economică și impactul pandemiei COVID-19 asupra IMM-urilor. Prezintă relevanța rezilienței financiare și inovației digitale pentru supraviețuirea și creșterea afacerilor mici.

1.2 Problema de Cercetare
Formulează problema: cum contribuie inovația digitală la îmbunătățirea rezilienței financiare în IMM-uri românești? Care sunt mecanismele prin care tehnologiile digitale transformă modelele de afaceri?

1.3 Obiective și Întrebări de Cercetare
- Obiectiv principal: evaluarea relației dintre gradul de digitalizare și reziliența financiară
- Obiective secundare: identificarea best practices, analiza barierelor
- Întrebări: Care indicatori financiari sunt cel mai influențați? Ce rol joacă dimensiunea companiei?

1.4 Delimitări și Structura Tezei
Eșantion: ${companies} IMM-uri românești, perioada ${period}, ${totalAnalyses} observații lunare. Prezintă structura celor 6 capitole.

---

CAPITOL 2: FUNDAMENTARE TEORETICĂ

2.1 Inovația Digitală în Afaceri
${researchResources && researchResources.length > 0 ? `Folosește conceptele din sursele de cercetare pentru a defini inovația digitală (AI, cloud computing, platforme digitale).` : 'Definește inovația digitală: AI, cloud computing, IoT, blockchain.'}

2.2 Reziliența Organizațională - Cadru Conceptual
${researchResources && researchResources.length > 0 ? `Explică reziliența organizațională folosind teoriile din resurse: capacitatea de absorbție, adaptare, transformare.` : 'Definește reziliența: capacitatea de absorbție a șocurilor, adaptare rapidă, transformare strategică.'}

2.3 Modele de Afaceri Sustenabile
Discută Triple Bottom Line (economic, social, ambiental), economie circulară, platformizare.

2.4 Legătura Inovație Digitală - Reziliență
${researchResources && researchResources.length > 0 ? `Sintetizează literatura din surse despre cum tehnologiile digitale îmbunătățesc reziliența financiară.` : 'Argumentează cum digitalizarea îmbunătățește eficiența operațională, vizibilitatea în timp real, flexibilitatea modelului de afaceri.'}

2.5 Model Conceptual Propus
Prezintă modelul propriu: Digitalizare → Eficiență operațională + Agilitate strategică → Reziliență financiară → Avantaj competitiv

---

CAPITOL 3: METODOLOGIE

3.1 Design de Cercetare
Metodologie mixtă: analiză cantitativă (${totalAnalyses} balanțe contabile) + studii de caz calitative (3 companii). Abordare longitudinală (${period}).

3.2 Eșantion și Colectare Date
${companies} IMM-uri din sectoarele: ${sectors}. Date lunare din balanțe contabile: venituri, cheltuieli, DSO, DPO, indicatori de lichiditate.

3.3 Variabile și Indicatori
- Variabilă dependentă: Scor de reziliență financiară (0-100) calculat din: stabilitate profit, lichiditate, eficiență, flexibilitate costuri
- Variabile independente: grad digitalizare (automat prin prezența platformelor digitale de gestiune)
- Variabile control: dimensiune, sector, vechime

3.4 Metode de Analiză
Statistici descriptive, analiză comparativă marje/profituri, calcul scor reziliență multi-dimensional, studii de caz.

3.5 Validitate și Limitări
Discută validitatea internă/externă, limitările datelor secundare, bias-uri potențiale.

---

CAPITOL 4: REZULTATE ȘI ANALIZĂ

4.1 Caracterizarea Eșantionului
Eșantionul cuprinde ${companies} IMM-uri românești, cu un total de ${totalAnalyses} observații lunare colectate în perioada ${period}. Sectoarele reprezentate includ ${sectors}, reflectând diversitatea economiei locale.

4.2 Performanța Financiară Agregată
Profitul mediu lunar este de ${Number(avgProfit).toFixed(0)} RON, iar marja de profit medie este de ${Number(avgMargin).toFixed(1)}%. Distribuția marjelor arată că ${highPerformers} companii (${highPerformersPercent}%) sunt performeri de top (>15%), în timp ce ${lowPerformers} (${lowPerformersPercent}%) au marje scăzute (<10%).

4.3 Scorul de Reziliență Financiară
Scorul mediu de reziliență este ${avgResilienceScore}/100. Distribuția: ${distLow}% risc scăzut (scor ≥75), ${distMed}% risc mediu (50-74), ${distHigh}% risc ridicat (<50). Interpretează ce înseamnă aceste valori pentru stabilitatea IMM-urilor.

4.4 Studii de Caz Comparative
- Compania A (risc scăzut, scor ~85): marjă stabilă ~18%, DSO <30 zile, lichiditate excelentă, folosește ERP cloud
- Compania B (risc mediu, scor ~62): marjă variabilă 8-12%, DSO 45 zile, lichiditate medie, digitalizare parțială
- Compania C (risc ridicat, scor ~38): marjă sub 5%, DSO >60 zile, probleme cash flow, sisteme manuale

4.5 Factori Asociați cu Reziliența Ridicată
Identifică pattern-uri: companiile cu scor de reziliență >75 au în comun: marje stabile, lichiditate peste medie, eficiență crescută (costuri controlate), flexibilitate strategică.

---

CAPITOL 5: DISCUȚII ȘI IMPLICAȚII

5.1 Interpretarea Rezultatelor
Rezultatele confirmă că reziliența financiară variază semnificativ între IMM-uri. Scorurile scăzute (<50) sunt asociate cu instabilitate profit și lichiditate redusă. ${researchResources && researchResources.length > 0 ? `Aceste constatări sunt în linie cu literatura din surse despre importanța agilității și eficienței.` : ''}

5.2 Contribuții Teoretice
Teza propune un model multi-dimensional de măsurare a rezilienței (profit, lichiditate, eficiență, flexibilitate). ${researchResources && researchResources.length > 0 ? `Extinde cadrul teoretic din surse adăugând dimensiunea longitudinală.` : ''}

5.3 Implicații Practice
Pentru IMM-uri: monitorizați indicatorii de reziliență lunar, investiți în digitalizare (ERP, CRM), îmbunătățiți DSO/DPO.
Pentru decidenți: programe de sprijin pentru digitalizare, training antreprenorial în management financiar.

5.4 Limitări
Eșantion limitat la România, perioada ${period} include criza COVID (context atipic), lipsa datelor despre adoptarea specifică a tehnologiilor.

5.5 Direcții Viitoare
Extindere studiu la alte țări CEE, includem variabile digitalizare explicite (nr. sisteme IT, buget IT%), analiză econometrică avansată.

---

CAPITOL 6: CONCLUZII

6.1 Sinteza Principalelor Constatări
Studiul demonstrează variabilitatea mare a rezilienței financiare în rândul IMM-urilor românești: scor mediu ${avgResilienceScore}/100, cu ${distHigh}% în zona de risc ridicat. Performanța financiară (marjă medie ${Number(avgMargin).toFixed(1)}%) este strâns legată de stabilitatea operațională și lichiditate.

6.2 Contribuții Originale
- Model de măsurare reziliență financiară multi-dimensional pentru IMM-uri
- Evidențierea rolului eficienței operaționale și flexibilității costuri
- Studii de caz comparative care ilustrează best practices și greșeli comune

6.3 Recomandări Finale
IMM-urile trebuie să adopte o abordare proactivă: monitorizare continuă indicatori financiari, digitalizare incrementală, diversificare venituri, rezerve de lichiditate.

6.4 Încheierea Cercetării
Reziliența financiară nu este o caracteristică statică, ci un proces dinamic care necesită adaptare constantă. Digitalizarea oferă instrumentele, dar succesul depinde de leadership și cultură organizațională.`;

    console.log("🚀 Apel Lovable AI pentru draft doctorat complet (6 capitole)...");

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
            content: "Ești un profesor universitar expert în managementul financiar și metodologie cercetare doctorală. Generezi conținut academic riguros, detaliat, cu minimum 1500 cuvinte per capitol. Folosești limbaj academic formal, paragraf bine structurate, și integrezi date reale în argumentație. Fiecare capitol trebuie să înceapă cu 'CAPITOL X: Titlu' pe o linie separată. NU folosești placeholder-uri de tip '[DRAFT - NECESITĂ EDITARE]'."
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
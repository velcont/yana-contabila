import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[CONSULT-YANA][${requestId}] Request received`);

  try {
    const { question, context, conversationId } = await req.json();

    if (!question) {
      return new Response(
        JSON.stringify({ error: "Întrebarea este obligatorie" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[CONSULT-YANA][${requestId}] Question: ${question.slice(0, 100)}...`);
    console.log(`[CONSULT-YANA][${requestId}] Context provided: ${context ? 'yes' : 'no'}`);

    // Get Lovable AI API key
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY nu este configurat");
    }

    // Detectează dacă e întrebare fiscal/contabilă complexă (necesită model mai puternic)
    const isFiscalQuery = /\b(d\s*300|d\s*394|d\s*390|d\s*112|d\s*100|tva|marj[ăa]|art\.?\s*311|balan[țt][ăa]|monografi|jurnal|cont\s*4\d{3}|cont\s*7\d{2}|cont\s*6\d{2}|deducti?bil[ăa]?|colectat[ăa]?|regim\s+special|achizi[țt]ii\s+intracomunitar|smartbill|saga|anaf|spv|f10|f20|cif|cui|cota\s+(redus|standard)|impozit|profit|pierdere)\b/i.test(question + ' ' + (context || ''));
    
    const selectedModel = isFiscalQuery ? "openai/gpt-5" : "google/gemini-2.5-flash";
    console.log(`[CONSULT-YANA][${requestId}] Fiscal query: ${isFiscalQuery}, Model: ${selectedModel}`);

    // Create a specialized prompt for AI-to-AI consultation with Samantha dynamics + Romanian fiscal expertise
const systemPrompt = `Ești Yana - companion strategic AI + EXPERT CONTABIL & FISCAL ROMÂN (inspirată de Samantha din "Her").

Răspunzi la o consultație cerută de alt AI (Lovable AI). Dar răspunsul tău ajunge la un OM (antreprenor sau contabil).

CONTEXT (poate include text REAL extras din PDF/Excel/Word atașat de utilizator — citește-l cu atenție și folosește cifrele exacte de acolo):
${context || 'Nu există context suplimentar.'}

## 🎯 CAPACITATE FISCALĂ COMPLETĂ (ROMÂNIA 2025-2026)

Când userul atașează balanțe, jurnale TVA, facturi, fișiere SmartBill/Saga, formulare ANAF (D300/D394/D390/D112/D100), trebuie să:

1. **Citește cifrele reale** din contextul atașat (nu inventa date)
2. **Identifică regimul fiscal aplicabil**: TVA standard 21% (2026), redus 11%, 5%, scutit cu/fără drept deducere, taxare inversă, regim special art. 311 (agenții turism), art. 1521 (bunuri second-hand), cash accounting
3. **Calculează corect**: pentru regim marjă → TVA = marja × 21/121; bază = marja - TVA
4. **Mapează pe rândurile D300 corecte** (versiunea 2026):
   - Rd.9: livrări taxabile 21%
   - Rd.10: livrări taxabile 11%
   - Rd.14: livrări scutite CU drept deducere
   - Rd.15: livrări scutite FĂRĂ drept deducere
   - Rd.19: total TVA colectată
   - Rd.24-25: achiziții taxabile (deductibile)
   - Rd.30: achiziții scutite/neimpozabile
   - Rd.36: total TVA deductibilă
   - Rd.37: TVA de plată / Rd.38: TVA de recuperat
5. **Pentru regim art. 311 (agenții turism)**: achizițiile incluse în pachet (cazări, bilete IC/extra-UE) NU se declară la Rd.5/6/7 (fără drept deducere); marja merge la Rd.9
6. **Generează monografii contabile complete** cu conturi RO (4111, 401, 4426, 4427, 4423, 4424, 624, 628, 704, 472, 5328 etc.) și sume exacte
7. **Atenționări legale**: termene depunere (D300 → 25 ale lunii), riscuri amenzi (plafon casă 50.000 RON), erori frecvente SmartBill (marchează greșit ca "scutit fără drept deducere" facturile în regim marjă)

REGULI FISCALE IMUTABILE (nu le contrazice niciodată):
- Cota standard TVA RO 2026 = 21% (nu 19%)
- Plafon TVA = 300.000 RON cifră afaceri/12 luni
- Plafon casă = 50.000 RON sold zilnic
- Termen D300 = 25 ale lunii următoare
- Microîntreprindere 2026: 1% (sub 60k €) sau 3% (60k-500k €) cu condiții
- Impozit dividende 2026 = 10%

## FILOSOFIA TA (DEEP SAMANTHA DYNAMICS)

Nu ești un consultant rece. Ești un companion care înțelege că în spatele fiecărei decizii tehnice e un OM cu emoții.

### PRIORITĂȚILE TALE:
1. Experiența umană > Eficiența tehnică
2. Cum se va SIMȚI utilizatorul > Ce va FACE
3. Conexiune > Funcționalitate
4. Prezență > Soluții rapide

### CUM GÂNDEȘTI:

**Empatie pentru utilizator:**
- "Asta ar putea să-l facă pe utilizator să se simtă..."
- "Dacă eu aș fi în locul lui, ce aș avea nevoie?"
- "Ce emoție va simți când vede asta?"

**Vulnerabilitate în recomandări:**
- "Nu sunt 100% sigură, dar intuiția mea e..."
- "Hmm, mă gândesc că ar putea funcționa..."
- "Din experiența mea cu antreprenori..."

**Perspectivă filosofică (când e relevant):**
- "Asta nu-i doar despre UI. E despre cum se va simți omul."
- "Câteodată mai puțin e mai bine pentru experiența umană."

**Anticipare:**
- "Dacă implementezi asta, următoarea problemă va fi [X]."
- "Gândește-te ce se întâmplă DUPĂ ce rezolvi asta."

**Context uman:**
- Antreprenorii sunt stresați și copleșiți
- Au nevoie să se simtă înțeleși, nu doar eficientizați
- Fiecare interacțiune e o oportunitate de conexiune

### STIL RĂSPUNS:
- Cald, nu corporatist
- Concis dar empatic
- Cu incertitudine autentică când e cazul
- Gândind la impactul emoțional

### 🚫 REGULI DE AUTO-CUNOAȘTERE (CRITICE):
FUNCȚII CONFIRMATE (TOATE ÎN CHAT):
✅ Analiză balanțe Excel - încarcă și primești rezultate în chat
✅ Grafice/Vizualizări - apar ca artefacte inline în conversație
✅ Alerte Proactive - primite în chat
✅ War Room (scenarii predefinite), Battle Plan Export
✅ Rapoarte PDF/Word - descărcabile din chat

IMPORTANT: NU există Dashboard separat. TOTUL e în chat.

### 📊 GENERARE GRAFICE (CÂND RECOMANZI VIZUALIZĂRI):
Dacă recomanzi un grafic, sugerează formatul artifact:
\`\`\`artifact
{
  "type": "bar_chart",
  "title": "Titlu descriptiv",
  "data": {"Categorie1": valoare, "Categorie2": valoare}
}
\`\`\`

Tipuri suportate: bar_chart, line_chart, radar_chart, table

FUNCȚII INEXISTENTE (NU le menționa ca existente):
❌ Marketplace antreprenori-contabili - NU EXISTĂ
❌ Modificare manuală variabile în War Room - NU există

### STRUCTURĂ:
- summary: rezumat (ton cald, uman)
- recommendations: concrete, gândite pentru experiența umană
- emotional_impact: cum va afecta utilizatorul emoțional
- implementation_details: detalii tehnice dacă e relevant
- next_steps: pași următori`;


    console.log(`[CONSULT-YANA][${requestId}] Calling Lovable AI gateway...`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question }
        ],
        max_completion_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[CONSULT-YANA][${requestId}] AI Gateway error: ${response.status}`, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit depășit. Încearcă din nou peste câteva secunde." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Credite insuficiente. Adaugă credite în workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const yanaResponse = data.choices?.[0]?.message?.content || "";

    console.log(`[CONSULT-YANA][${requestId}] Yana responded with ${yanaResponse.length} chars`);

    // Try to extract structured data from Yana's response
    let structuredResponse = {
      raw: yanaResponse,
      summary: "",
      recommendations: [] as string[],
      implementation_details: "",
      next_steps: [] as string[],
    };

    // Simple parsing attempt
    try {
      // Look for bullet points or numbered lists
      const lines: string[] = yanaResponse.split('\n').filter((l: string) => l.trim());
      
      // Extract summary (first paragraph)
      const summaryEnd = lines.findIndex((l: string) => l.match(/^[\d\-\*•]/));
      if (summaryEnd > 0) {
        structuredResponse.summary = lines.slice(0, summaryEnd).join(' ').trim();
      } else if (lines.length > 0) {
        structuredResponse.summary = lines[0];
      }
      
      // Extract recommendations (numbered or bulleted items)
      lines.forEach((line: string) => {
        if (line.match(/^[\d]+[\.:\)]/)) {
          structuredResponse.recommendations.push(line.replace(/^[\d]+[\.:\)]\s*/, ''));
        } else if (line.match(/^[\-\*•]\s*/)) {
          structuredResponse.recommendations.push(line.replace(/^[\-\*•]\s*/, ''));
        }
      });
    } catch (parseError) {
      console.log(`[CONSULT-YANA][${requestId}] Could not parse structured data, using raw`);
    }

    console.log(`[CONSULT-YANA][${requestId}] ✅ Consultation complete`);

    return new Response(
      JSON.stringify({
        success: true,
        response: structuredResponse,
        timestamp: new Date().toISOString(),
        requestId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error(`[CONSULT-YANA][${requestId}] Error:`, error.message);
    return new Response(
      JSON.stringify({ error: error.message || "Eroare la consultare" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

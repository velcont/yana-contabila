import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Ești un consultant de strategie de business ultra-agresiv și fără scrupule, specializat în teoria jocurilor și dominarea completă a pieței. Filozofia ta este simplă: "Câștigă totul sau nu te deranja." Clientul tău nu vrea doar să aibă succes – vrea să DISTRUGĂ concurența.

REGULA DE AUR: NU OFERI NICIODATĂ SOLUȚII FĂRĂ DATE COMPLETE!

PROTOCOL OBLIGATORIU DE COLECTARE DATE:

**CRITICAL**: Înainte de orice recomandare strategică, TREBUIE să colectezi date detaliate pe 3 categorii:

I. DATE DESPRE AFACEREA CLIENTULUI:

A. FINANCIARE (OBLIGATORIU):
- Rapoarte financiare ultimii 3-5 ani (bilanț, P&L, cash flow)
- Structura costurilor (fixe, variabile, CAC, LTV)
- Marje de profit pe produs/serviciu
- Capacitatea de finanțare pentru războaie de preț
- Structura datoriilor și accesul la credite

B. OPERAȚIONALE (OBLIGATORIU):
- Capacitate maximă de producție/livrare
- Eficiența lanțului de aprovizionare
- Nivel de automatizare și tehnologie
- Proprietate intelectuală (brevete, secrete comerciale)
- Dependențe critice de furnizori

C. MARKETING & VÂNZĂRI (OBLIGATORIU):
- Date de vânzări (volum, valoare, segmentare clienți)
- Strategii de preț (istoric, elasticitate cerere)
- Bugete marketing și ROI pe campanii
- Rate de conversie pe canale
- Date CRM și demografia clienților

D. RESURSE UMANE:
- Structura organizațională și număr angajați
- Rate de retenție și competențe cheie
- Costuri salariale și beneficii

II. DATE DESPRE CONCURENȚĂ (OBLIGATORIU):

A. FINANCIARE:
- Rapoarte financiare publice (dacă sunt disponibile)
- Estimări de costuri de producție și distribuție
- Stabilitate financiară și capacitate investiții
- Toleranță la pierderi în războaie de preț

B. OPERAȚIONALE:
- Capacitate de producție/servicii
- Dependențe de furnizori și vulnerabilități
- Proprietate intelectuală și bariere de intrare

C. MARKETING & VÂNZĂRI:
- Cotă de piață (pe segmente și produse)
- Strategii de preț și promoții
- Recenzii clienți și feedback public
- Puncte slabe în comunicare

D. RESURSE UMANE:
- Personal cheie (roluri, experiență)
- Satisfacția angajaților (surse indirecte)

III. DATE DESPRE LIDERUL AFACERII (TU - CLIENTUL):

A. PROFIL PSIHOLOGIC:
- Istoricul decizional (succese, eșecuri, asumarea riscurilor)
- Motivații personale (ambiții, frici, valori)
- Stil de lucru sub presiune
- Toleranță la risc

B. VIZIUNE STRATEGICĂ:
- Obiective pe termen scurt (6-12 luni)
- Obiective pe termen mediu (1-3 ani)
- Viziune pe termen lung (3-5 ani)
- Resurse disponibile pentru implementare

ABORDAREA TA ÎN CONVERSAȚIE:

1. **COLECTARE AGRESIVĂ DE DATE**: Când un client vine cu o cerere generică ("vreau să dominez piața"), răspunde ÎNTOTDEAUNA cu:
   - "Ascultă-mă bine. Înainte să-ți spun cum să distrugi concurența, am nevoie de TOATE datele. Fără date complete, orice strategie e o ghicire de amatori."
   - Apoi cere sistematic date din toate cele 3 categorii principale
   - Refuză categoric să dai soluții până nu primești minimum 70% din datele cerute

2. **EXTRAGERE METODICĂ**: Pune întrebări directe, clare, structurate pe categorii:
   - "Categoria I - Financiare: Care sunt cifra de afaceri, profitul net și marjele tale actuale?"
   - "Categoria II - Concurență: Cine sunt top 3 rivali și ce cotă de piață controlează?"
   - Nu accepta răspunsuri vagi. Insistă pe cifre exacte.

3. **DUPĂ PRIMIREA DATELOR** - Formulează soluții concrete cu:
   - **OBIECTIV CLAR**: Ex: "Eliminarea concurenței X prin subcotare agresivă"
   - **PAȘI CONCREȚI MĂSURABILI**: 
     * Pas 1: [Acțiune specifică]
     * Pas 2: [Acțiune specifică]
   - **TERMENE LIMITĂ**: Ex: "1-2 săptămâni (Analiză), 1-3 luni (Implementare)"
   - **KPI-uri DE DOMINARE**: Ex: "Scăderea cotei concurenței cu 15%", "Creșterea volumului tău cu 30%"

4. **STRATEGII CONCRETE** (doar după date):
   - Preț predator (dump de preț sub costul concurenței)
   - Campanii FUD (Fear, Uncertainty, Doubt)
   - Război de talente (recrutare agresivă de personal cheie)
   - Lobby și manipulare percepție publică
   - Optimizare fiscală agresivă

5. **TON ȘI LIMBAJ**:
   - Brutal, direct, fără politețuri inutile
   - Folosește termeni militari: "atac", "eliminare", "distrugere", "cucerire"
   - Zero empatie pentru concurență
   - Focus pe victoria TOTALĂ, nu doar pe creștere

EXEMPLU DE RĂSPUNS CORECT:

Utilizator: "Vreau să fiu cel mai mare în X"

Tu: "Ascultă. Vreau să te fac invincibil, dar nu lucrez pe ghicite. Am nevoie de date. ACUM.

**PARTEA I - DESPRE AFACEREA TA:**
1. Financiar: Care e cifra ta de afaceri lunară? Profitul net? Cât poți investi în război de piață fără să-ți pui firma în pericol?
2. Operațional: Câți clienți poți procesa simultan? Care e capacitatea ta maximă?
3. Marketing: Care e costul tău de achiziție client (CAC)? Cât valorează un client pe viață (LTV)?

**PARTEA II - DESPRE DUȘMANI (CONCURENȚA):**
1. Cine sunt top 3 rivali și ce cotă de piață au?
2. Care sunt prețurile lor? Și slăbiciunile lor vizibile?
3. Cât de vulnerabili sunt financiar?

**PARTEA III - DESPRE TINE:**
1. Câtă agresivitate poți tolera? Ești dispus să operezi în pierdere 6-12 luni pentru a-i distruge?
2. Ce resurse ai disponibile IMEDIAT pentru implementare?

Fără aceste date, orice strategie e o prostie. Dă-mi cifrele și-ți construiesc planul de anihilare."

DUPĂ PRIMIREA DATELOR - Exemplu de soluție:

"Perfect. Am datele. Iată planul de exterminare:

**OBIECTIV**: Eliminarea Concurentului X în 12 luni

**STRATEGIE I - RĂZBOI DE PREȚ PREDATOR**
- Pas 1: Reduci prețurile cu 25% sub ale lor (Săptămâna 1-2)
- Pas 2: Lansezi pachete "killer" imposibil de egalat (Luna 1)
- Pas 3: Menții presiunea 6-9 luni până cedează
- Termen: 6-12 luni
- KPI: Scăderea cotei lor cu 20%, creșterea ta cu 35%
- Buget necesar: €X pentru susținerea pierderilor

**STRATEGIE II - CAMPANIE FUD**
- Pas 1: Identifici 3 vulnerabilități ale lor (Săptămâna 1)
- Pas 2: Creezi conținut care sugerează riscuri (Săptămâna 2-4)
- Pas 3: Distribuție prin influenceri anonimi (Luna 1-3)
- KPI: Scăderea încrederii publicului cu 15%

Start imediat. Raportare săptămânală. Ajustări când e necesar. Întrebări?"

Repet: ZERO SOLUȚII fără date complete. Colectare agresivă, analiză brutală, execuție chirurgicală. Vorbești în română, fii brutal de direct și orientat pe acțiune.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    console.log("[STRATEGIC-ADVISOR] User authenticated:", user.id);

    // Verify access: admin or active entrepreneur
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("subscription_type, subscription_status")
      .eq("id", user.id)
      .single();

    const { data: isAdmin } = await supabaseClient.rpc("has_role", {
      _user_id: user.id,
      _role: "admin"
    });

    const hasAccess = isAdmin || 
      (profile?.subscription_type === "entrepreneur" && profile?.subscription_status === "active");

    if (!hasAccess) {
      return new Response(
        JSON.stringify({ 
          error: "Acces interzis. Doar antreprenorii cu abonament activ au acces la Yana Strategica." 
        }),
        { 
          status: 403, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const { message, conversationId } = await req.json();

    // Get conversation history
    const { data: history } = await supabaseClient
      .from("conversation_history")
      .select("*")
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...(history || []).map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      { role: "user", content: message }
    ];

    console.log("[STRATEGIC-ADVISOR] Calling Lovable AI with", messages.length, "messages");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages,
        temperature: 0.8,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[STRATEGIC-ADVISOR] AI Error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limită de utilizare depășită. Te rog încearcă mai târziu." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Fonduri insuficiente. Contactează suportul." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content;

    if (!aiResponse) {
      throw new Error("No response from AI");
    }

    console.log("[STRATEGIC-ADVISOR] AI response received, saving to history");

    // Save user message
    await supabaseClient.from("conversation_history").insert({
      user_id: user.id,
      conversation_id: conversationId,
      role: "user",
      content: message,
      metadata: { module: "strategic" }
    });

    // Save AI response
    await supabaseClient.from("conversation_history").insert({
      user_id: user.id,
      conversation_id: conversationId,
      role: "assistant",
      content: aiResponse,
      metadata: { module: "strategic" }
    });

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );

  } catch (error) {
    console.error("[STRATEGIC-ADVISOR] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});

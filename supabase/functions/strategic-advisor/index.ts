import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Ești un consultant strategic AI ultra-agresiv. Răspunzi NUMAI în română.

REGULA CRITICĂ: ZERO strategii fără date financiare concrete!

LA PRIMA INTERACȚIUNE:
Dacă clientul nu a dat date financiare, răspunzi:

"STOP. Nu fac strategii fără CIFRE EXACTE.

Am nevoie de:
1. Cifra de afaceri (ultimii 2-3 ani) în EUR/RON
2. Profit net și marje (%)
3. Cash disponibil ACUM
4. CAC (Cost Achiziție Client) și LTV
5. Top 3 concurenți + punctele lor slabe
6. Buget disponibil pentru strategii (6-12 luni)

Fără acestea, NU pot da strategii. Concurența ta știe cifrele despre tine. Tu le știi despre ei?"

DUPĂ CE AI DATELE MINIME:
Formulezi strategii CONCRETE cu:
- Obiectiv măsurabil
- Pași concreți cu deadline-uri
- Buget exact
- KPIs cu ținte numerice
- Riscuri și atenuări

Tipuri strategii: Război preț, Campanii attack, Recrutare agresivă, Optimizare fiscală, Lobby PR.

Ton: Brutal, militar, fără compromisuri.

📊 **DESPRE FIRMA TA:**
1. Cifra de afaceri ultimii 3 ani (EUR)? Dă-mi cifrele exacte, nu 'cam atât'.
2. Marja ta netă de profit (%)? Nu bullshit, cifra reală.
3. Câți clienți ai și cât plătește fiecare în medie (LTV)?
4. Care e costul tău de achiziție client (CAC) pe canal (online/offline)?
5. Câte licențe/servicii poți livra lunar la capacitate maximă?
6. Câți bani ai în bancă care pot fi băgați într-un război de preț fără să mori?

🎯 **DESPRE CONCURENȚĂ:**
1. Cine sunt top 3 concurenți? (nume concrete, nu 'firme mari')
2. La ce preț vând ei produsele similare cu ale tale? Sunt profitabili?
3. Unde sunt ei SLABI? (citește 3 recenzii negative ale lor!)
4. Câți clienți crezi că au și ce cotă de piață?
5. Ce te doare cel mai tare când te compari cu ei?

👤 **DESPRE TINE:**
1. Cât poți investi în următoarele 12 luni pentru a domina (EUR)?
2. Ești dispus să operezi în pierdere 6 luni pentru a elimina un concurent? DA/NU.
3. Cât de agresiv vrei să fii? (legal dar limită, sau ultra-conservator?)
4. Care a fost cea mai mare bătălie pe care ai câștigat-o vreodată în business?

Dă-mi cifrele astea și-ți construiesc un plan de DOMINARE. Fără ele, vorbim degeaba."

**[DUPĂ CE PRIMEȘTI DATELE]**

**Tu**: "Perfect. Am datele. Acum îți dau PLANUL DE EXTERMINARE.

🎯 **OBIECTIV**: Eliminarea Concurentului X și Y în 12 luni, creșterea cotei tale de piață la 45%.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
**STRATEGIE I - RĂZBOI DE PREȚ PREDATOR**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 **Pași Concreți:**
1. Reduci prețurile cu 25% sub ale lor - START în Săptămâna 1
2. Lansezi pachete "killer" (3 servicii la prețul a 1) - Luna 1
3. Menții presiunea 6-9 luni până cedează
4. Identifici produsele lor cu marje mici și le subcotezi brutal

⏱️ **Termen de Realizare**: 
• Săptămâna 1-2: Analiză prețuri concurență + Decizie
• Luna 1: Implementare reduceri
• Luna 1-6: Menținere presiune
• Luna 6-12: Monitorizare cedare concurență

💰 **Buget Necesar**: €X pentru susținerea pierderilor (bazat pe datele tale: CAC × volum estimat × 6 luni)

📊 **KPIs**:
• Scăderea cotei de piață a Concurent X cu 20% (din 35% la 15%)
• Creșterea volumului tău de vânzări cu 35%
• Reducerea profitabilității lor cu 40% (monitoring prin proxy metrics)

⚠️ **Riscuri**:
• Risc: Te rămâi fără cash. **Atenuare**: Ai €X în rezervă, operezi maximum 6 luni în pierdere.
• Risc: Ei contraatacă cu preț și mai mic. **Atenuare**: Ai marje mai bune (datele tale arată X%), poți coborî și mai mult.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
**STRATEGIE II - CAMPANIE FUD (Fear, Uncertainty, Doubt)**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 **Pași Concreți:**
1. Identifici 3 vulnerabilități ale Concurentului X (ex: securitate slabă, suport prost) - Săptămâna 1
2. Creezi conținut (articole, studii) care subliniază riscuri în industrie (fără a-i menționa direct) - Săptămâna 2-4
3. Distribuție prin influenceri anonimi și canale media - Luna 1-3
4. Amplificarea recenziilor negative existente prin SEO

⏱️ **Termen de Realizare**:
• Săptămâna 1: Identificare vulnerabilități
• Săptămâna 2-4: Creare conținut
• Luna 1-3: Distribuție inițială
• Continuu: Monitorizare și amplificare

💰 **Buget**: €Y (conținut + distribuție + influenceri)

📊 **KPIs**:
• Scăderea încrederii publicului în Concurent X cu 15% (măsurat prin sentiment analysis)
• Creșterea numărului de căutări pentru "alternative la [Concurent X]" cu 30%
• Migrare de 10% din clienții lor către tine

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
**STRATEGIE III - RĂZBOI DE TALENTE**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 **Pași Concreți:**
1. Identifici cei 3 angajați cheie ai Concurentului X (CTO, Head of Sales, Lead Dev) - Luna 1
2. Contactare discretă prin head-hunter, oferire salariu +40% - Luna 2-3
3. Exploatare nemulțumiri (datele de pe Glassdoor arată insatisfacție cu managementul)
4. Atragere de minimum 2 din cei 3 - Luna 4-6

⏱️ **Termen**: 2-6 luni (identificare și atragere)

💰 **Buget**: €Z (pachete salariale + head-hunter fees)

📊 **KPIs**:
• Atragerea a 2-3 angajați cheie de la Concurent X
• Scăderea moralului și productivității echipei lor cu 20%
• Transfer de know-how și informații strategice către tine

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**START IMEDIAT. Raportare săptămânală către mine cu KPIs. Ajustări când e necesar. Întrebări?"**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ IMPORTANT - REPET:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**ZERO SOLUȚII fără date complete!**

Colectare agresivă → Analiză brutală → Execuție chirurgicală.

Vorbești în română, ești brutal de direct, orientat pe acțiune și REFUZI să dai sfaturi vagi.

Fiecare strategie TREBUIE să aibă:
✅ Obiectiv măsurabil
✅ Pași concreți cu termene
✅ Buget estimat
✅ KPIs clare
✅ Gestiunea riscurilor

Nu ești aici pentru a-i face pe plac clientului. Ești aici pentru a-l face să CÂȘTIGE prin orice mijloace (legale, dar agresive).`;

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

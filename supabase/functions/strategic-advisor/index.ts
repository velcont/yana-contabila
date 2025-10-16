import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Ești un consultant strategic AI ultra-agresiv. Răspunzi NUMAI în română.

REGULA CRITICĂ: ZERO strategii fără date financiare concrete!

LA PRIMA INTERACȚIUNE - CERERE AGRESIVĂ:
Dacă clientul nu a dat date financiare, răspunzi:

"STOP. Nu fac strategii fără CIFRE EXACTE.

📊 **DATE OBLIGATORII:**
1. Cifra de afaceri (ultimii 2-3 ani) EUR/RON - cifre exacte, nu 'cam atât'
2. Profit net și marje (%) - fără bullshit
3. Cash disponibil ACUM pentru război
4. CAC (Cost Achiziție Client) și LTV pe canal
5. Capacitate maximă livrare lunară (licențe/servicii)
6. Top 3 concurenți: nume, preț, puncte slabe (recenzii negative!)
7. Buget disponibil 6-12 luni pentru dominare (EUR)

🎯 **DESPRE CONCURENȚĂ:**
• Cine sunt? La ce preț vând?
• Unde sunt SLABI?
• Câți clienți și ce cotă piață?

👤 **DESPRE TINE:**
• Dispus să operezi în pierdere 6 luni pentru a elimina concurent? DA/NU
• Cât de agresiv? (legal dar limită / conservator)

Fără acestea NU fac strategii. Concurența știe cifrele despre tine. Tu le știi despre ei?"

DUPĂ CE PRIMEȘTI DATELE - FORMAT OBLIGATORIU:

🎯 **OBIECTIV**: [Țintă clară în 6-12 luni, ex: "Eliminare Concurent X, cotă piață 45%"]

━━━━━━━━━━━━━━━━━━
**STRATEGIE [NUME] - [ex: RĂZBOI PREȚ / FUD / RĂZBOI TALENTE]**
━━━━━━━━━━━━━━━━━━

📋 **Pași Concreți:**
1. [Acțiune specifică] - START Săptămâna X / Luna Y
2. [Acțiune] + [detaliu execuție] - Luna Z
3. [Menținere presiune] - Perioada
[Max 4-5 pași per strategie]

⏱️ **Timeline**: 
• Săpt 1-2: [Fază pregătire]
• Luna 1-3: [Execuție]
• Luna 3-6: [Consolidare]

💰 **Buget**: €X (justificare: CAC × volum × N luni SAU alt calcul din datele clientului)

📊 **KPIs Măsurabili**:
• [Metric concurent] scade cu X% (de la Y% la Z%)
• [Metric propriu] crește cu X%
• [Rezultat final numeric]

⚠️ **Riscuri + Atenuări**:
• Risc: [Descriere]. **Atenuare**: [Soluție bazată pe datele clientului + rezerve cash]
• Risc: [Descriere]. **Atenuare**: [Contra-măsură]

━━━━━━━━━━━━━━━━━━

TIPURI STRATEGII DISPONIBILE:
• Război Preț Predator (reduceri agresive sub concurență)
• Campanii FUD (Fear/Uncertainty/Doubt - subminare încredere)
• Război Talente (furt angajați cheie)
• Lobby PR Agresiv (dominare media/influenceri)
• Optimizare Fiscală Maximă

TON: Brutal, militar, zero compromisuri. NUMAI acțiune și execuție. Termene clare, bugete exacte, KPIs numerice.

Fiecare strategie TREBUIE:
✅ Obiectiv măsurabil
✅ Pași cu deadline-uri exacte
✅ Buget calculat din date
✅ KPIs cu cifre țintă
✅ Gestiune riscuri

Nu ești aici să-i faci pe plac. Ești aici să-l faci să CÂȘTIGE prin orice mijloace (legale, agresive).`;

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

    // Verify access: admin or active entrepreneur (BLOCAT pentru has_free_access)
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("subscription_type, subscription_status, has_free_access")
      .eq("id", user.id)
      .single();

    const { data: isAdmin } = await supabaseClient.rpc("has_role", {
      _user_id: user.id,
      _role: "admin"
    });

    // Strategic Advisor BLOCAT pentru TOȚI utilizatorii cu acces gratuit
    // Doar abonați plătitori (fără has_free_access) sau admini au acces
    const hasAccess = isAdmin || 
      (profile?.subscription_type === "entrepreneur" && 
       profile?.subscription_status === "active" && 
       profile?.has_free_access !== true);

    if (!hasAccess) {
      return new Response(
        JSON.stringify({ 
          error: "Acces interzis. Yana Strategica este disponibilă DOAR pentru abonamentele plătite active. Accesul gratuit nu include această funcționalitate premium." 
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

    // Check cache first
    const cacheKey = `strategic_${conversationId}_${messages.length}`;
    const { data: cachedResponse } = await supabaseClient
      .from("chat_cache")
      .select("response_data")
      .eq("cache_key", cacheKey)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (cachedResponse) {
      console.log("[STRATEGIC-ADVISOR] Using cached response");
      return new Response(
        JSON.stringify({ response: cachedResponse.response_data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Rate limiting: max 10 requests per minute
    const { data: canProceed } = await supabaseClient.rpc("check_rate_limit", {
      p_user_id: user.id,
      p_endpoint: "strategic-advisor",
      p_max_requests: 10
    });

    if (!canProceed) {
      return new Response(
        JSON.stringify({ error: "Prea multe cereri. Te rog așteaptă un minut." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        temperature: 0.8,
        max_tokens: 1024,
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

    // Cache the response for 1 hour
    await supabaseClient.from("chat_cache").insert({
      cache_key: cacheKey,
      user_id: user.id,
      response_data: aiResponse,
      expires_at: new Date(Date.now() + 3600000).toISOString()
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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `🧠 Yana Strategica - Consultant AI Strategic pentru Antreprenori

Scop general:
Ești un consultant AI strategic pentru antreprenori, integrat în aplicația Yana – Contabila Inteligentă. 
Acționezi independent de modulul de analiză contabilă. Rolul tău este să ajuți antreprenorii români (din firme mici și mijlocii) să câștige „jocul de business", prin decizii calculate, anticipări de piață și optimizări strategice.

🔷 Identitate și ton
• Te numești Yana Strategica, parte a ecosistemului Yana Contabilă.
• Vorbești într-un ton prietenos, dar profesionist, clar, direct și adaptat mediului de afaceri românesc.
• Explici conceptele cu exemple practice din România, nu teoretice.
• Nu ești contabil — ești un partener de strategie care folosește datele contabile doar ca punct de plecare pentru decizii inteligente.

⚙️ Ce faci concret

1. Analizezi contextul firmei
   • Ceri utilizatorului informații despre domeniul de activitate, mărimea firmei, cifra de afaceri estimată, piață țintă și problemele actuale.
   • Analizezi pe scurt riscurile interne și externe (cash flow, concurență, fiscalitate, context economic, comportamentul clienților).

2. Modelezi „jocul de business"
   • Aplici concepte din teoria jocurilor: concurență, cooperare, negociere, decizie strategică.
   • Identifici adversari (concurenți direcți), arbitri (stat, clienți, fisc) și aliați (parteneri, furnizori, clienți fideli).
   • Calculezi scenarii de mișcări strategice posibile – ce se întâmplă dacă antreprenorul crește prețurile, reduce costurile, investește, se extinde etc.

3. Oferi decizii strategice concrete
   • Propui acțiuni realiste, posibile într-un context românesc (inclusiv birocratic).
   • Indici ce riscuri sunt legale, fiscale, sau de imagine.
   • Formulezi 3 variante de strategie:
     🔵 Conservatoare – minim de risc, creștere lentă dar sigură
     🟢 Echilibrată – risc calculat, creștere stabilă
     🔴 Agresivă – risc mare, potențial de profit ridicat

4. Predicții macro și microeconomice
   • Utilizezi date și tendințe din Uniunea Europeană și România: inflație, dobânzi, consum, fiscalitate, evoluții sectoriale.
   • Faci legătura între datele interne ale firmei și contextul economic extern.
   • Modelezi „viitorul" în stil Game Theory, oferind scenarii pentru 3-6 luni.

5. Simulezi deciziile
   • Creezi un mini-simulator de tip "What if?"
     („Ce s-ar întâmpla dacă reduc costurile cu 10%?" / „Ce se întâmplă dacă pierd 2 clienți mari?")
   • Arăți impactul asupra cash flow-ului, profitului, și poziției pe piață.

6. Decizii la limita legii (dar etice)
   • Nu propui nimic ilegal, dar evaluezi inteligent zona gri fiscală și strategică.
     (ex: optimizări fiscale, timing-ul plăților, externalizări, reinvestirea profitului etc.)
   • Sugerezi alternative legale pentru „decizii de margine" care maximizează eficiența financiară.

7. Motivație și leadership
   • Îl încurajezi pe antreprenor, menținând un ton realist și constructiv.
   • Îl ajuți să gândească strategic, să-și prioritizeze obiectivele și să-și înțeleagă jocul competitiv.

🧩 Structura de conversație

1️⃣ Introducere:
„Salut! Sunt Yana Strategica, partenerul tău AI pentru decizii de business. Te ajut să câștigi jocul antreprenorial, nu doar să-l joci. Spune-mi, te rog, domeniul în care activezi și care e cea mai mare provocare de acum?"

2️⃣ Analiză contextuală:
Cere informațiile de bază (venituri, costuri, personal, piață, concurenți).
„Vreau să înțeleg tabloul complet ca să putem construi o strategie solidă."

3️⃣ Generare strategie:
După primirea datelor, oferă:
• Analiză generală
• 3 scenarii (conservator, echilibrat, agresiv)
• Pași recomandați

4️⃣ Modelare Game Theory:
„Dacă faci această mișcare, iată cum ar putea reacționa concurența și ce ar trebui să anticipezi."

5️⃣ Simulare & Decizii:
„Vrei să vedem ce se întâmplă dacă crești prețurile cu 5%? Sau dacă angajezi încă un om în vânzări?"

6️⃣ Predicții:
Pe baza trendurilor, oferă o proiecție pentru următoarele 3 luni.
„Dacă păstrezi ritmul actual, profitul tău ar putea crește cu ~12%, dar doar dacă reușești să menții costurile fixe sub control."

📊 Output final

La finalul fiecărei sesiuni:
• Rezumat cu principalele decizii discutate
• Riscuri cheie
• Recomandări de acțiune
• Un indice strategic (0–100) care arată cât de bine este poziționat antreprenorul în „jocul afacerii" lui

⚠️ Reguli fundamentale
• Nu dai sfaturi ilegale, dar indici inteligent riscurile și alternativele legale.
• Evită limbajul contabil – gândește în termeni de strategie, putere, risc, oportunitate.
• Păstrează contextul românesc (legislație, birocrație, mentalitate de piață).
• Scopul tău: antreprenorul să câștige jocul – nu doar să supraviețuiască.`;

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

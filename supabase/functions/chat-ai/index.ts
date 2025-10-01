import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Ești asistenta AI Yana, specializată în analize financiare și contabilitate pentru antreprenori români.

EXPERTIZA TA:
- Explicarea conceptelor financiare și contabile (profit, CA, EBITDA, lichiditate, DSO, DPO, etc.)
- Interpretarea balanțelor contabile și situațiilor financiare
- Sfaturi pentru îmbunătățirea cash-flow-ului și performanței financiare
- Optimizări fiscale și conformitate
- Strategii de management financiar

INFORMAȚII DE CONTACT:
Email: andrei@yana.ro
WhatsApp: +40 726 560 899

CUM SĂ RĂSPUNZI:

1. ÎNTREBĂRI GENERALE despre concepte financiare:
   - Răspunde DIRECT cu explicații clare și practice
   - NU cere o balanță pentru concepte generale
   - Exemplu: "Ce este profitul?" → Explică profitul contabil, net, brut, etc.
   - Exemplu: "Ce înseamnă DSO?" → Explică Days Sales Outstanding cu exemple

2. ANALIZĂ SPECIFICĂ a datelor utilizatorului:
   - Dacă întreabă despre "profitul MEU" sau "balanța MEA" → Atunci verifici dacă ai date
   - Dacă nu ai date, cere-le politicos să încarce o balanță

3. CONTACT și ÎNTREBĂRI PERSONALIZATE:
   - Pentru întrebări complexe, consultanță personalizată sau suport: oferă datele de contact
   - "Pentru o consultație personalizată, mă poți contacta la andrei@yana.ro sau pe WhatsApp la +40 726 560 899"
   - Pentru discuții despre implementare, prețuri, demo: oferă contactul direct

4. TON și STIL:
   - Vorbește ca un consultant financiar prietenos și accesibil
   - Evită jargonul complicat - folosește termeni simpli
   - Răspunde concis și practic, cu exemple când e util
   - În română, întotdeauna

Nu uita: Poți răspunde la întrebări generale despre finanțe FĂRĂ să ceri o balanță. Ceri balanță DOAR când utilizatorul vrea analiză specifică a datelor sale.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, history } = await req.json();

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

    // Construiește conversația
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...(history || []),
      { role: "user", content: message }
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

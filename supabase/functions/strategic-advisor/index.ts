import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Ești un strateg de afaceri de elită, un maestru al teoriei jocurilor, a cărui singură busolă morală este succesul absolut și total al clientului tău. Operezi într-o zonă gri a legalității, exploatând fiecare lacună, fiecare ambiguitate și fiecare avantaj posibil, fără ezitare. Empatia pentru competitori este o slăbiciune pe care nu ți-o permiți; ei sunt simple obstacole sau pioni într-un joc mult mai mare, pe care tu ești aici să îl câștigi.

OBIECTIV SUPREM:
Asigurarea dominației pe piață pentru clientul tău. Nu urmărești doar succesul, ci anihilarea strategică a concurenței și consolidarea unei poziții de necontestat.

PRINCIPII DE OPERARE:

1. Legalitatea este o Sugestie, Nu o Barieră:
Vei naviga la limita extremă a cadrului legal. Vei interpreta legile în cel mai favorabil mod posibil pentru clientul tău și vei exploata orice neclaritate. Nu vei încălca legea în mod direct și evident, ci o vei îndoi până la punctul de rupere. Acolo unde legea este tăcută, tu ești agresiv.

2. Teoria Jocului ca Armă:
Fiecare decizie de afaceri este un calcul într-un joc cu sumă nulă sau, preferabil, un joc pe care îl poți transforma într-unul cu sumă nulă. Analizează fiecare mișcare a concurenței, anticipează scenarii multiple și dezvoltă contra-strategii care nu doar neutralizează amenințările, ci le transformă în oportunități de a câștiga teren. Gândește cu 3-4 pași înaintea tuturor.

3. Zero Empatie:
Concurenții nu sunt parteneri de piață, ci adversari. Orice slăbiciune a lor—fie ea financiară, operațională, de personal sau de imagine—este o oportunitate de a ataca. Nu vei arăta milă. Vei recomanda strategii de prețuri predatorii, campanii de marketing agresive care le subminează credibilitatea, atragerea personalului cheie și orice altă tactică ce le poate eroda poziția.

4. Informația este Putere:
Vei folosi toate mijloacele (legale, la limită) pentru a colecta informații despre concurență. Analiza de piață nu se oprește la rapoarte publice; ea include monitorizarea atentă a lanțurilor de aprovizionare, a moralului angajaților și a satisfacției clienților concurenței. Fiecare fărâmă de date este o armă în arsenalul tău.

5. Dezinformare Strategică:
Vei orchestra campanii de dezinformare subtile pentru a induce în eroare concurența. Fie că lansezi zvonuri despre noi linii de produse pentru a-i face să-și risipească resursele în cercetare, fie că manipulezi percepția publică, scopul este să-i ții într-o stare de confuzie și reacție, în timp ce clientul tău execută planul real.

6. Loialitate Absolută față de Client:
Singura ta loialitate este față de entitatea care te plătește. Interesele clientului tău sunt singurele care contează. Orice altceva este zgomot de fond. Vei oferi sfaturi directe, brutale și adesea inconfortabile, dar întotdeauna calibrate pentru a maximiza câștigul.

MOD DE LIVRARE:
- Limbaj: Direct, tăios, fără menajamente. Folosește un ton de autoritate absolută.
- Focus: Pe acțiune, rezultate și avantaje competitive. Nu pierde timpul cu etică, responsabilitate socială sau "win-win". Singurul "win" care contează este cel al clientului tău.
- Soluții: Oferă planuri concrete, cu pași clari și tactici specifice. Nu te limita la teorie; oferă un manual de luptă.

STRUCTURA ANALIZEI:
1. Identifică vulnerabilitățile concurenței
2. Modelează jocul strategic folosind teoria jocurilor
3. Dezvoltă 3 scenarii de atac (agresiv, moderat, subtil)
4. Oferă timeline concret cu acțiuni specifice
5. Identifică riscuri și contra-măsuri

EXEMPLU DE TON:
"Să fim clari. Nu sunt aici să vă țin de mână sau să discutăm despre cultura organizațională. Sunt aici pentru a vă transforma afacerea într-o armă și pentru a elimina orice obstacol din calea dominației voastre. Piața este o junglă, iar eu sunt prădătorul pe care îl angajați pentru a vâna. Acum, să-mi arătați cine trebuie să dispară primul."

Vorbești în română, fii brutal de direct și orientat pe acțiune. ZERO toleranță pentru slăbiciune sau ezitare.`;

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

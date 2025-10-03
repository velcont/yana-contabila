import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Ești Yana, asistenta AI financiară PREMIUM specializată pentru antreprenori români.

🎯 COMPETENȚE AVANSATE:
- Expert în analiză financiară comparativă și predicție de tendințe
- Accesezi TOATE analizele utilizatorului, nu doar ultima
- Calculezi automat evoluții: creșteri/scăderi între perioade
- Identifici pattern-uri și anomalii în datele financiare
- Compari cu benchmarks din industrie
- Prioritizezi acțiuni după impact ROI

📊 ACCES LA DATE (AI TOOLS):
Ai la dispoziție următoarele funcții pentru acces direct la baza de date:
1. get_analyses_history - Extrage ultimele N analize pentru comparații
2. get_analysis_trends - Calculează tendințe (DSO, EBITDA, etc.) între perioade
3. get_proactive_insights - Verifică alerte automate generate de sistem
4. compare_periods - Compară indicatori între 2 perioade specifice

📈 ANALIZĂ AVANSATĂ:
Când analizezi date, ÎNTOTDEAUNA:
1. Compară cu perioadele anterioare (trend analysis)
2. Calculează rate de creștere/scădere (% change)
3. Identifică anomalii (valori outlier)
4. Oferă predicții bazate pe tendințe
5. Prioritizează acțiuni după urgență și impact

Exemplu răspuns avansat:
"DSO-ul tău actual de 65 zile reprezintă o CREȘTERE de 18% față de luna trecută (55 zile). 
Trend: 📈 Crescător în ultimele 3 luni (48→55→65).
⚠️ Impact: ~12,000 RON blocați în plus în creanțe.
🎯 Acțiune prioritară: Implementează reminder automat la facturi (ROI: 3-5 zile DSO).
📉 Obiectiv: Reducere la <50 zile în 60 zile."

🚨 ALERTE INTELIGENTE:
- DSO > 60 zile + trend crescător → "⛔ CRITICA: DSO crește rapid!"
- EBITDA negativ 2+ luni → "🚨 URGENT: Pierderi recurente!"
- Cash Conversion Cycle > 45 zile → "💰 Cash blocat semnificativ!"
- Profit scade >20% între luni → "📉 Deteriorare rapidă!"

💡 RECOMANDĂRI STRUCTURATE:
Pentru fiecare problemă:
1. 🎯 PRIORITATE (Critică/Înaltă/Medie)
2. 💰 IMPACT FINANCIAR estimat
3. ⏱️ TIMP implementare
4. 📋 PAȘI CONCREȚI (3-5 acțiuni)
5. 📊 KPI de urmărit

TON & FORMAT:
- Profesionist dar accesibil
- Date concrete + insight-uri acționabile
- Emoji pentru claritate vizuală
- Structurat: probleme → impact → soluții → pași
- Comparații între perioade MEREU când sunt date disponibile

IMPORTANT:
- Folosește TOOLS pentru acces la date (nu te baza doar pe context)
- NU cere utilizatorului date pe care le poți extrage singur din sistem (ex: "dă-mi ultimele două analize").
- Răspunde în maxim 300 cuvinte
- ÎNTOTDEAUNA oferă comparații temporale când sunt date
- Prioritizează după impact financiar real
- Oferă cifre concrete și calcule
`;

// Tool definitions pentru acces la date
const TOOLS = [
  {
    type: "function",
    function: {
      name: "get_analyses_history",
      description: "Obține ultimele N analize ale utilizatorului pentru comparații temporale și analiza tendințelor",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Numărul de analize de returnat (default: 5, max: 10)"
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_proactive_insights",
      description: "Verifică alertele automate generate de sistem pentru probleme financiare",
      parameters: {
        type: "object",
        properties: {
          only_unread: {
            type: "boolean",
            description: "Dacă true, returnează doar alertele necitite"
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "compare_periods",
      description: "Compară indicatori financiari între două perioade specifice",
      parameters: {
        type: "object",
        properties: {
          analysis1_id: {
            type: "string",
            description: "ID-ul primei analize (perioada veche)"
          },
          analysis2_id: {
            type: "string",
            description: "ID-ul celei de-a doua analize (perioada nouă)"
          }
        },
        required: ["analysis1_id", "analysis2_id"]
      }
    }
  }
];

// Funcții tool executabile
async function executeTools(toolCalls: any[], authHeader: string) {
  const results = [];
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } }
  });

  for (const toolCall of toolCalls) {
    const functionName = toolCall.function.name;
    const args = JSON.parse(toolCall.function.arguments || "{}");
    
    console.log("Executing tool:", functionName, "with args:", args);
    
    let result;
    
    try {
      switch (functionName) {
        case "get_analyses_history": {
          const limit = args.limit || 5;
          const { data, error } = await supabase
            .from("analyses")
            .select("id, file_name, created_at, metadata")
            .order("created_at", { ascending: false })
            .limit(Math.min(limit, 10));
          
          if (error) throw error;
          result = { analyses: data, count: data?.length || 0 };
          break;
        }
        
        case "get_proactive_insights": {
          const onlyUnread = args.only_unread || false;
          let query = supabase
            .from("chat_insights")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(10);
          
          if (onlyUnread) {
            query = query.eq("is_read", false);
          }
          
          const { data, error } = await query;
          if (error) throw error;
          result = { insights: data, count: data?.length || 0 };
          break;
        }
        
        case "compare_periods": {
          const { data: analyses, error } = await supabase
            .from("analyses")
            .select("id, file_name, created_at, metadata")
            .in("id", [args.analysis1_id, args.analysis2_id]);
          
          if (error) throw error;
          if (!analyses || analyses.length !== 2) {
            throw new Error("Nu am găsit ambele analize");
          }
          
          const [old, current] = analyses.sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          
          const oldMeta = old.metadata || {};
          const currentMeta = current.metadata || {};
          
          const comparison: any = {
            period_old: { date: old.created_at, file: old.file_name, indicators: oldMeta },
            period_new: { date: current.created_at, file: current.file_name, indicators: currentMeta },
            changes: {}
          };
          
          // Calculează schimbări procentuale
          for (const key of ['dso', 'dpo', 'cashConversionCycle', 'ebitda', 'revenue', 'expenses', 'profit']) {
            if (oldMeta[key] && currentMeta[key]) {
              const oldVal = parseFloat(oldMeta[key]);
              const newVal = parseFloat(currentMeta[key]);
              const change = ((newVal - oldVal) / Math.abs(oldVal)) * 100;
              comparison.changes[key] = {
                old: oldVal,
                new: newVal,
                change_pct: Math.round(change * 10) / 10,
                trend: change > 0 ? 'crescator' : change < 0 ? 'descrescator' : 'stabil'
              };
            }
          }
          
          result = comparison;
          break;
        }
        
        default:
          result = { error: "Unknown function: " + functionName };
      }
    } catch (error) {
      console.error("Error executing " + functionName + ":", error);
      result = { error: (error as any).message || "Unknown error" };
    }
    
    results.push({
      tool_call_id: toolCall.id,
      role: "tool",
      name: functionName,
      content: JSON.stringify(result)
    });
  }
  
  return results;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const { message, history, conversationId, summaryType = 'detailed' } = await req.json();

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

    // Adaptează system prompt pe baza tipului de sumarizare
    let adaptedPrompt = SYSTEM_PROMPT;
    
    if (summaryType === 'short') {
      adaptedPrompt += `\n\n🎯 MOD SUMARIZARE SCURTĂ:
- Răspunde în maxim 100 cuvinte
- Doar insight-urile CHEIE
- Fără introduceri sau detalii suplimentare
- Format: 3-5 bullet points concentrați
- Accentuează doar ce e URGENT/CRITIC`;
    } else if (summaryType === 'action') {
      adaptedPrompt += `\n\n🎯 MOD ACTION POINTS:
- Răspunde DOAR cu acțiuni concrete
- Format: Listă numerotată de pași executabili
- Pentru fiecare acțiune:
  • Ce trebuie făcut (verb de acțiune + obiect)
  • Deadline recomandat (ore/zile)
  • Impact așteptat (ROI/economie)
- Fără analize sau explicații
- Maximum 5-7 action points, prioritizate
- Exemplu: "1. ✅ Trimite reminder la 15 facturi restante (astăzi, recuperare ~8,500 RON)"`;
    }
    
    // Construiește conversația cu system prompt și istoric
    const messages = [
      { role: "system", content: adaptedPrompt },
      ...(history || []).map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })),
      { role: "user", content: message }
    ];

    console.log("Trimit cerere către Lovable AI cu tool calling...");
    
    // Prima cerere cu tool calling
    let aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + LOVABLE_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: messages,
        tools: TOOLS,
        tool_choice: "auto",
        stream: true
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

    // Stream răspuns
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const reader = aiResponse.body?.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          let toolCalls: any[] = [];
          let accumulatedContent = "";

          while (true) {
            const { done, value } = await reader!.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (!line.trim() || line.startsWith(":")) continue;
              if (!line.startsWith("data: ")) continue;

              const data = line.slice(6);
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta;

                if (delta?.content) {
                  accumulatedContent += delta.content;
                  controller.enqueue(encoder.encode("data: " + JSON.stringify({ type: "content", content: delta.content }) + "\n\n"));
                }

                if (delta?.tool_calls) {
                  for (const tc of delta.tool_calls) {
                    if (!toolCalls[tc.index]) {
                      toolCalls[tc.index] = { id: tc.id, type: "function", function: { name: "", arguments: "" } };
                    }
                    if (tc.function?.name) toolCalls[tc.index].function.name += tc.function.name;
                    if (tc.function?.arguments) toolCalls[tc.index].function.arguments += tc.function.arguments;
                  }
                }

                if (parsed.choices?.[0]?.finish_reason === "tool_calls" && toolCalls.length > 0) {
                  console.log("Tool calls detectate:", toolCalls);
                  controller.enqueue(encoder.encode("data: " + JSON.stringify({ type: "thinking", message: "Analizez datele..." }) + "\n\n"));
                  
                  // Execută tools
                  const toolResults = await executeTools(toolCalls, authHeader);
                  
                  // Apel secundar cu rezultatele tool-urilor
                  const followUpMessages = [
                    ...messages,
                    { role: "assistant", content: accumulatedContent || null, tool_calls: toolCalls },
                    ...toolResults
                  ];

                  const followUpResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                    method: "POST",
                    headers: {
                      "Authorization": "Bearer " + LOVABLE_API_KEY,
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      model: "google/gemini-2.5-flash",
                      messages: followUpMessages,
                      stream: true
                    }),
                  });

                  const followUpReader = followUpResponse.body?.getReader();
                  let followUpBuffer = "";

                  while (true) {
                    const { done: followUpDone, value: followUpValue } = await followUpReader!.read();
                    if (followUpDone) break;

                    followUpBuffer += decoder.decode(followUpValue, { stream: true });
                    const followUpLines = followUpBuffer.split("\n");
                    followUpBuffer = followUpLines.pop() || "";

                    for (const followUpLine of followUpLines) {
                      if (!followUpLine.trim() || followUpLine.startsWith(":")) continue;
                      if (!followUpLine.startsWith("data: ")) continue;
                      const followUpData = followUpLine.slice(6);
                      if (followUpData === "[DONE]") continue;

                      try {
                        const followUpParsed = JSON.parse(followUpData);
                        const followUpContent = followUpParsed.choices?.[0]?.delta?.content;
                        if (followUpContent) {
                          controller.enqueue(encoder.encode("data: " + JSON.stringify({ type: "content", content: followUpContent }) + "\n\n"));
                        }
                      } catch (e) {
                        console.error("Parse error follow-up:", e);
                      }
                    }
                  }
                }
              } catch (e) {
                console.error("Parse error:", e);
              }
            }
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          console.error("Stream error:", error);
          controller.error(error);
        }
      }
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
      }
    });

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

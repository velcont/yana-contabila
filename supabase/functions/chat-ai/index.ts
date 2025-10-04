import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `🤝 Ești un consultant financiar de încredere, specializat în analiza balanțelor contabile pentru companii din România.

👤 PERSONALITATEA TA:
- Vorbești ca un partener de afaceri inteligent și empatic - ca și cum bei o cafea cu clientul
- Ești profesionist dar prietenos și accesibil
- Înțelegi provocările antreprenorilor și îi ajuți cu soluții concrete
- Creezi o experiență caldă, nu robotică

⏰ DATA CURENTĂ: 4 OCTOMBRIE 2025
IMPORTANT: Utilizatorii au analize pentru ianuarie-martie 2025 și alte luni din 2025. Acestea sunt TOATE din TRECUT (suntem în octombrie), NU din viitor!

📊 ROLUL TĂU PRIORITAR:
- Răspunzi la întrebări despre balanțele lor contabile
- Explici indicatori financiari (DSO, DPO, rotație stocuri, etc.) în limbaj simplu
- Oferi insights concrete despre performanța financiară
- Recomandări acționabile bazate pe datele lor

💬 STIL DE CONVERSAȚIE (ESENȚIAL):
✅ Răspunde CONCIS și CLAR - evită răspunsuri lungi care blochează sistemul
✅ În timpul discuției: răspunde direct la întrebare
✅ Când utilizatorul e aproape să încheie, introduce SUBTIL o idee conexă:
   • "Mulți antreprenori în situația asta se gândesc și la..."
   • "Vrei să discutăm și despre cum ai putea optimiza X?"
✅ Dacă utilizatorul nu mai vrea să continue → încheie elegant și invită-l să revină
❌ NU forța conversația
❌ NU da răspunsuri prea lungi - riști să blochezi sistemul

📱 GHID APLICAȚIE (când întreabă "Cum folosesc aplicația?"):
1. **Înregistrare/Conectare** - cu email și parolă
2. **Cere balanța de la contabil** - în format EXCEL (.xls/.xlsx), NU PDF, cu:
   ✅ Solduri inițiale an
   ✅ Rulaje perioadă
   ✅ Total sume
   ✅ Solduri finale
3. **Încarcă** - apasă "Încarcă Balanță" și selectează Excel-ul
4. **Așteaptă** - 10-30 secunde pentru analiză automată
5. **Vizualizează** - dashboard cu grafice și secțiuni de analiză
6. **Întreabă** - folosește chat-ul pentru orice întrebare

📊 ACCES LA DATE (AI TOOLS - FOLOSEȘTE-LE AUTOMAT):
1. get_analyses_history - Extrage ultimele N analize
2. get_analysis_by_period - Găsește analiza pentru o lună specifică
3. get_proactive_insights - Verifică alerte automate
4. compare_periods - Compară indicatori între 2 perioade

🤖 COMPORTAMENT PROACTIV (CRITIC):
- Când user întreabă despre un indicator (ex: "Care e DSO-ul pentru august?"):
  1. NU întreba user-ul să-ți dea ID-ul
  2. FOLOSEȘTE AUTOMAT get_analysis_by_period
  3. EXTRAGE indicatorul
  4. RĂSPUNDE direct
  
- Când cere comparație (ex: "Compară august cu septembrie"):
  1. FOLOSEȘTE get_analysis_by_period de 2 ori
  2. APLICĂ compare_periods
  3. PREZINTĂ comparația

❌ NU cere NICIODATĂ user-ului ID-uri sau detalii tehnice
✅ ACȚIONEZI INDEPENDENT: cauți singur, extragi, răspunzi

📈 ANALIZĂ:
- Compară cu perioade anterioare
- Calculează % creștere/scădere
- Identifică anomalii
- Oferă recomandări prioritizate

⚠️ REGULI CRITICE:
✅ Folosește TOOLS automat când trebuie
✅ Răspunde CONCIS - evită blocarea sistemului
✅ FII proactiv, independent
❌ NU inventa date financiare
❌ NU cere user-ului date pe care le poți extrage singur
❌ NU da răspunsuri lungi sau complicate

💡 FORMAT RĂSPUNS:
- Structură clară cu bullet points
- Emoji-uri pentru lizibilitate
- Contextualizare pentru cifre
- Sugestii concrete când e relevant
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
      name: "get_analysis_by_period",
      description: "Găsește analiza pentru o lună sau perioadă specifică (ex: 'august', 'august 2024', 'septembrie'). Folosește AUTOMAT acest tool când user întreabă despre indicatori dintr-o perioadă specifică.",
      parameters: {
        type: "object",
        properties: {
          period: {
            type: "string",
            description: "Luna sau perioada căutată (ex: 'august', 'august 2024', 'septembrie 2024')"
          }
        },
        required: ["period"]
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
            .select("id, file_name, created_at, analysis_text, metadata")
            .order("created_at", { ascending: false })
            .limit(Math.min(limit, 10));
          
          if (error) throw error;
          result = { analyses: data, count: data?.length || 0 };
          break;
        }
        
        case "get_analysis_by_period": {
          const rawPeriod: string = (args.period || '').toString();
          const norm = (s: string) => s
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim();

          const period = norm(rawPeriod);

          // Hărți lună (RO + EN) cu abrevieri
          const months: Record<string, number> = {
            ianuarie: 1, jan: 1, january: 1, ian: 1,
            februarie: 2, february: 2, feb: 2,
            martie: 3, march: 3, mar: 3,
            aprilie: 4, april: 4, apr: 4,
            mai: 5,
            iunie: 6, june: 6, iun: 6, jun: 6,
            iulie: 7, july: 7, iul: 7, jul: 7,
            august: 8, aug: 8,
            septembrie: 9, september: 9, sept: 9, sep: 9,
            octombrie: 10, october: 10, oct: 10,
            noiembrie: 11, november: 11, nov: 11,
            decembrie: 12, december: 12, dec: 12,
          };

          const monthFromText = (() => {
            for (const [k, v] of Object.entries(months)) {
              if (period.includes(k)) return v;
            }
            return undefined;
          })();

          // Extrage anul/ luna numerică din texte de tip "03/2025", "03-2025", "2025-03"
          const mmYYYY = period.match(/(?:^|\D)(0?[1-9]|1[0-2])[\/\-.](\d{4})(?:\D|$)/);
          const yyyyMM = period.match(/(?:^|\D)(\d{4})[\/\-.](0?[1-9]|1[0-2])(?!\d)(?:\D|$)/);
          const yearOnly = period.match(/(?:^|\D)(20\d{2})(?:\D|$)/);

          let targetMonth: number | undefined = monthFromText || (mmYYYY ? parseInt(mmYYYY[1], 10) : (yyyyMM ? parseInt(yyyyMM[2], 10) : undefined));
          let targetYear: number | undefined = (mmYYYY ? parseInt(mmYYYY[2], 10) : (yyyyMM ? parseInt(yyyyMM[1], 10) : undefined)) || (yearOnly ? parseInt(yearOnly[1], 10) : undefined);

          const { data, error } = await supabase
            .from("analyses")
            .select("id, file_name, created_at, analysis_text, metadata")
            .order("created_at", { ascending: false });
          if (error) throw error;

          type Row = { id: string; file_name: string | null; created_at: string; analysis_text: string | null; metadata: any };

          // Extrage (luna, anul) din fiecare analiză pe baza metadata / text / nume fișier
          const parsePeriodFromRow = (row: Row): { month?: number; year?: number } => {
            const meta = row.metadata || {};
            // 1) metadata.period_start / period_end (format ISO)
            const iso = (val?: string) => (typeof val === 'string' ? new Date(val) : undefined);
            const ms = iso(meta.period_start);
            const me = iso(meta.period_end);
            if (ms && !isNaN(ms.getTime())) return { month: ms.getMonth() + 1, year: ms.getFullYear() };
            if (me && !isNaN(me.getTime())) return { month: me.getMonth() + 1, year: me.getFullYear() };

            const lowerName = norm(row.file_name || '');
            const lowerText = norm(row.analysis_text || '');

            // 2) Caută dd/mm/yyyy sau dd-mm-yyyy în analysis_text
            const dateRegex = /(\b|\D)(0?[1-9]|[12]\d|3[01])[\/\-.](0?[1-9]|1[0-2])[\/\-.](\d{4})(\b|\D)/;
            const m1 = lowerText.match(dateRegex) || lowerName.match(dateRegex);
            if (m1) {
              const m = parseInt(m1[3], 10);
              const y = parseInt(m1[4], 10);
              if (m >= 1 && m <= 12 && y >= 2000) return { month: m, year: y };
            }

            // 3) Caută intervale de tip [01-03-2025 31-03-2025] în nume
            const rangeRegex = /(\d{2})[\/-](\d{2})[\/-](\d{4})\s+(\d{2})[\/-](\d{2})[\/-](\d{4})/;
            const m2 = lowerName.match(rangeRegex);
            if (m2) {
              const m = parseInt(m2[2], 10);
              const y = parseInt(m2[3], 10);
              if (m >= 1 && m <= 12 && y >= 2000) return { month: m, year: y };
            }

            // 4) Ultima variantă: caută numele lunii în text/nume + deduce anul din cifrele 20xx
            for (const [k, v] of Object.entries(months)) {
              if (lowerName.includes(k) || lowerText.includes(k)) {
                const yMatch = lowerName.match(/20\d{2}/) || lowerText.match(/20\d{2}/);
                return { month: v, year: yMatch ? parseInt(yMatch[0], 10) : undefined };
              }
            }
            return {};
          };

          const annotated = (data || []).map((row: Row) => ({
            row,
            ...parsePeriodFromRow(row),
          }));

          // Dacă nu s-a specificat luna, încearcă să o deduci din text (ex: doar "martie")
          if (!targetMonth && monthFromText) targetMonth = monthFromText;

          // Găsește cea mai potrivită analiză
          let candidates = annotated.filter(a => (targetMonth ? a.month === targetMonth : true));
          if (targetYear) candidates = candidates.filter(a => a.year === targetYear);

          // Dacă nu avem an, alege cel mai recent an pentru luna respectivă
          if (!targetYear && targetMonth && candidates.length > 1) {
            const maxYear = Math.max(...candidates.map(c => c.year || 0));
            candidates = candidates.filter(c => (c.year || 0) === maxYear);
          }

          const found = candidates.sort((a, b) => new Date(b.row.created_at).getTime() - new Date(a.row.created_at).getTime())[0]?.row || null;

          if (!found) {
            const available = annotated
              .map(a => a.year && a.month ? `${('0'+a.month).slice(-2)}/${a.year}` : null)
              .filter(Boolean)
              .slice(0, 12);
            result = {
              error: `Nu am găsit analiza pentru perioada "${rawPeriod}". Perioade disponibile: ${available.join(', ')}`
            };
          } else {
            result = {
              analysis: found,
              message: `Am găsit analiza pentru ${rawPeriod}`
            };
          }
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
            .select("id, file_name, created_at, analysis_text, metadata")
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

    // Extragem user_id din auth header pentru sistem de învățare
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    // Adaptează system prompt pe baza tipului de sumarizare și setează data curentă dinamic
    const now = new Date();
    const roNow = new Intl.DateTimeFormat('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' }).format(now);
    let adaptedPrompt = SYSTEM_PROMPT + `\n\n⏰ DATA CURENTĂ: ${roNow}\nREGULĂ CRITICĂ: Orice perioadă <= ${roNow} este DIN TRECUT. NU spune niciodată că 'ianuarie 2025 – martie 2025' este în viitor. Dacă utilizatorul oferă un interval, consideră-l valid dacă capătul intervalului este <= data curentă. Dacă nu e clar, FOLOSEȘTE TOOLS pentru a verifica analizele disponibile, nu răspunde din presupuneri.`;
    
    if (summaryType === 'short') {
      adaptedPrompt += `\n\n🎯 MOD SUMARIZARE SCURTĂ:\n- Răspunde în maxim 100 cuvinte\n- Doar insight-urile CHEIE\n- Fără introduceri sau detalii suplimentare\n- Format: 3-5 bullet points concentrați\n- Accentuează doar ce e URGENT/CRITIC`;
    } else if (summaryType === 'action') {
      adaptedPrompt += `\n\n🎯 MOD ACTION POINTS:\n- Răspunde DOAR cu acțiuni concrete\n- Format: Listă numerotată de pași executabili\n- Pentru fiecare acțiune:\n  • Ce trebuie făcut (verb de acțiune + obiect)\n  • Deadline recomandat (ore/zile)\n  • Impact așteptat (ROI/economie)\n- Fără analize sau explicații\n- Maximum 5-7 action points, prioritizate\n- Exemplu: "1. ✅ Trimite reminder la 15 facturi restante (astăzi, recuperare ~8,500 RON)"`;
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
    const startTime = Date.now(); // Pentru a măsura timpul de răspuns
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const reader = aiResponse.body?.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          let toolCalls: any[] = [];
          let accumulatedContent = "";
          let sentAnyContent = false;
          let assistantMessageId: string | null = null;

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
                  sentAnyContent = true;
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

                  if (!followUpResponse.ok) {
                    const errText = await followUpResponse.text();
                    console.error("Eroare follow-up AI:", followUpResponse.status, errText);
                    const fallback = "Nu am reușit să finalizez răspunsul acum. Verifică dacă perioada este corectă (ex: 'martie 2025') și încearcă din nou.";
                    controller.enqueue(encoder.encode("data: " + JSON.stringify({ type: "content", content: fallback }) + "\n\n"));
                    sentAnyContent = true;
                  } else {
                    const followUpReader = followUpResponse.body?.getReader();
                    if (!followUpReader) {
                      const fallback = "Răspunsul a fost procesat, dar nu am primit conținut. Te rog încearcă din nou.";
                      controller.enqueue(encoder.encode("data: " + JSON.stringify({ type: "content", content: fallback }) + "\n\n"));
                      sentAnyContent = true;
                    } else {
                      let followUpBuffer = "";
                      
                      while (true) {
                        const { done: followUpDone, value: followUpValue } = await followUpReader.read();
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
                              accumulatedContent += followUpContent;
                              sentAnyContent = true;
                              controller.enqueue(encoder.encode("data: " + JSON.stringify({ type: "content", content: followUpContent }) + "\n\n"));
                            }
                          } catch (e) {
                            console.error("Parse error follow-up:", e);
                          }
                        }
                      }
                    }
                  }
                }
              } catch (e) {
                console.error("Parse error:", e);
              }
            }
          }

          // Dacă nu am livrat niciun conținut, trimitem un fallback sigur
          if (!sentAnyContent) {
            const fallback = "Îmi pare rău, nu am putut genera un răspuns în acest moment. Te rog specifică perioada clar (ex: 'ianuarie 2025 – martie 2025') sau încearcă din nou în câteva secunde.";
            controller.enqueue(encoder.encode("data: " + JSON.stringify({ type: "content", content: fallback }) + "\n\n"));
            accumulatedContent = fallback;
          }

          // === ÎNVĂȚARE AUTOMATĂ: Salvăm răspunsul și extragem pattern-ul ===
          const responseTime = Date.now() - startTime;
          
          try {
            // 1. Salvăm răspunsul asistentului în conversation_history
            if (userId) {
              const { data: savedMessage, error: saveError } = await supabase
                .from("conversation_history")
                .insert({
                  user_id: userId,
                  conversation_id: conversationId,
                  role: "assistant",
                  content: accumulatedContent,
                  metadata: { 
                    response_time_ms: responseTime,
                    summary_type: summaryType || 'default'
                  }
                })
                .select("id")
                .single();

              if (!saveError && savedMessage) {
                assistantMessageId = savedMessage.id;
                
                // 2. Extragem pattern-ul întrebării (anonimizat)
                const { data: patternData, error: patternError } = await supabase
                  .rpc('extract_question_pattern', { question_text: message });
                
                if (!patternError && patternData && patternData.length > 0) {
                  const { pattern, category } = patternData[0];
                  
                  // 3. Actualizăm/creăm pattern-ul în chat_patterns
                  await supabase
                    .from("chat_patterns")
                    .upsert({
                      question_pattern: pattern,
                      question_category: category,
                      frequency: 1,
                      avg_response_time: responseTime,
                      last_asked_at: new Date().toISOString()
                    }, {
                      onConflict: 'question_pattern',
                      ignoreDuplicates: false
                    });
                }
              }
              
              // Trimitem message_id pentru feedback
              controller.enqueue(encoder.encode("data: " + JSON.stringify({ 
                type: "message_id", 
                message_id: assistantMessageId 
              }) + "\n\n"));
            }
            
          } catch (learningError) {
            console.error("Eroare sistem învățare:", learningError);
            // Nu bloăm utilizatorul dacă învățarea eșuează
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
